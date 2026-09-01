/**
 * BookingModule — CreateBooking, intake validation, slot-hold creation.
 * ADR 0089 §5.1, ADR 0094 (intake schema), ADR 0090 (couple participant).
 *
 * Notes:
 * - CreateBooking is the entry point for both single-session and package
 *   purchases. For couple bookings, callers additionally call
 *   RecordCoupleParticipant for partner A and (separately) partner B.
 * - Intake validation rejects clinical narrative in `short_message` via
 *   the regex blocklist defined in ADR 0094 §1.4.
 * - Slot hold is 10 minutes; expiry handled by ExpireSlotHold command.
 */

import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import { AvailabilityModule } from "./availability";
import { DomainError, IntakeErrors, type AudienceMatch } from "../domain/types";

const SLOT_HOLD_TTL_MINUTES = 10;
const BOOKING_CUTOFF_MINUTES = 60;
const DEFAULT_TIMEZONE_OFFSET_MIN = 7 * 60; // Asia/Jakarta = UTC+7

const CLINICAL_BLOCKLIST: RegExp[] = [
  /(bunuh diri|suicide|kill myself|ending my life|不想活)/i,
  /(self[- ]harm|self harm|melukai diri)/i,
  /(darurat|emergency|panic attack|serangan panik)/i,
];

const E164_PHONE = /^\+[1-9]\d{6,14}$/;

export interface IntakeInput {
  displayName: string;
  contactEmail: string;
  contactPhone?: string | null;
  dateOfBirth?: string | null;
  consentVersion: string;
  crisisAck: boolean;
  shortMessage?: string | null;
  isCouple?: boolean;
  isPackage?: boolean;
}

export interface CreateBookingArgs {
  clientId: string;
  offerSnapshotId: string;
  slotId: string;
  intake: IntakeInput;
  idempotencyKey: string;
}

export interface CreateBookingResult {
  bookingId: string;
  slotHoldId: string;
  capacityReservationId: string;
  expiresAt: string;
}

export class BookingModule {
  constructor(
    private readonly db: PersistenceAdapter,
    private readonly availability: AvailabilityModule
  ) {}

  /**
   * Validate intake fields per ADR 0094 §1.
   * Returns the computed audience_match, or throws a typed DomainError.
   */
  validateIntake(input: IntakeInput, slotStartsAtUtc: string, now: Date): AudienceMatch {
    const name = (input.displayName ?? "").trim();
    if (!name || name.length > 120) {
      throw new DomainError(IntakeErrors.MissingName, "display_name invalid");
    }
    if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
      throw new DomainError(IntakeErrors.MissingEmail, "contact_email invalid");
    }
    if (input.contactPhone && !E164_PHONE.test(input.contactPhone)) {
      throw new DomainError(IntakeErrors.InvalidPhone, "contact_phone invalid");
    }
    if (!input.consentVersion) {
      throw new DomainError(IntakeErrors.InvalidConsentVersion, "consent_version required");
    }
    if (!input.crisisAck) {
      throw new DomainError(IntakeErrors.CrisisAckNotSet, "crisis disclaimer must be acknowledged");
    }
    if (input.shortMessage) {
      const stripped = input.shortMessage.trim();
      if (stripped.length > 280) {
        throw new DomainError(IntakeErrors.ClinicalNarrative, "short_message too long");
      }
      for (const re of CLINICAL_BLOCKLIST) {
        if (re.test(stripped)) {
          throw new DomainError(IntakeErrors.ClinicalNarrative, "short_message contains clinical content");
        }
      }
    }

    // Booking cutoff: now > slot_start - 60 minutes.
    const cutoffAt = new Date(slotStartsAtUtc).getTime() - BOOKING_CUTOFF_MINUTES * 60 * 1000;
    if (now.getTime() > cutoffAt) {
      throw new DomainError(IntakeErrors.CutoffTooLate, "booking is past the cutoff window");
    }

    // Audience match (very simple — real implementation looks up
    // aud_exclusion/aud_needs, but the cutoff-age check is the MVP gate).
    if (input.dateOfBirth) {
      const dob = new Date(input.dateOfBirth);
      const age = Math.floor(
        (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age >= 16 && age <= 17) {
        // minor route; guardian payload must be supplied separately by
        // RecordCoupleParticipant or Admin intake (out of scope here).
        return "minor_16_17_guardian";
      }
      if (age < 16 || age > 40) {
        return "out_of_scope";
      }
    }
    return "eligible_18_40";
  }

  async createBooking(args: CreateBookingArgs): Promise<CreateBookingResult> {
    const { rows: slotRows } = await this.db.query<{
      id: string;
      psychologist_id: string;
      offering_id: string;
      starts_at_utc: string;
      ends_at_utc: string;
    }>({
      sql: `SELECT id, psychologist_id, offering_id, starts_at_utc, ends_at_utc
            FROM availability_slot WHERE id = ? AND withdrawn = 0`,
      params: [args.slotId],
    });
    const slot = slotRows[0];
    if (!slot) {
      throw new DomainError("E-SLOT-NOT-FOUND", "availability_slot not found or withdrawn");
    }

    const audienceMatch = this.validateIntake(
      args.intake,
      slot.starts_at_utc,
      new Date()
    );

    // Pre-check overlap (ADR 0091 §6).
    const startWithBuffer = new Date(
      new Date(slot.starts_at_utc).getTime() -
        (await this.getTransitionBuffer(slot.offering_id)) * 60 * 1000
    ).toISOString();
    const endWithBuffer = new Date(
      new Date(slot.ends_at_utc).getTime() +
        (await this.getTransitionBuffer(slot.offering_id)) * 60 * 1000
    ).toISOString();
    const available = await this.availability.isSlotAvailable({
      psychologistId: slot.psychologist_id,
      startsAtUtc: startWithBuffer,
      endsAtUtc: endWithBuffer,
    });
    if (!available) {
      throw new DomainError("E-SLOT-UNAVAILABLE", "capacity overlap detected");
    }

    const bookingId = randomUUID();
    const slotHoldId = randomUUID();
    const capacityReservationId = randomUUID();
    const expiresAt = new Date(
      Date.now() + SLOT_HOLD_TTL_MINUTES * 60 * 1000
    ).toISOString();

    // Atomic batch: insert booking, slot_hold, capacity_reservation.
    // Idempotency via UNIQUE(idempotency_key) on payment and client_access.
    // ADR 0097: booking starts in 'pending_manual_payment' (WhatsApp manual flow).
    await this.db.batch([
      {
        sql: `INSERT INTO booking
              (id, client_id, offer_snapshot_id, state, is_package, is_couple,
               intake_short_message, crisis_ack)
              VALUES (?, ?, ?, 'pending_manual_payment', ?, ?, ?, ?)`,
        params: [
          bookingId,
          args.clientId,
          args.offerSnapshotId,
          args.intake.isPackage ? 1 : 0,
          args.intake.isCouple ? 1 : 0,
          args.intake.shortMessage ?? null,
          args.intake.crisisAck ? 1 : 0,
        ],
      },
      {
        sql: `INSERT INTO slot_hold
              (id, booking_id, slot_id, expires_at, state)
              VALUES (?, ?, ?, ?, 'active')`,
        params: [slotHoldId, bookingId, args.slotId, expiresAt],
      },
      {
        sql: `INSERT INTO capacity_reservation
              (id, psychologist_id, reservation_kind, parent_id,
               starts_at_utc, ends_at_utc, state)
              VALUES (?, ?, 'slot_hold', ?, ?, ?, 'hold_active')`,
        params: [
          capacityReservationId,
          slot.psychologist_id,
          slotHoldId,
          startWithBuffer,
          endWithBuffer,
        ],
      },
    ]);

    return { bookingId, slotHoldId, capacityReservationId, expiresAt };
  }

  /**
   * Look up transition buffer for a service offering.
   * Placeholder: returns default 15 minutes. Slice 1 will populate
   * from the live service_offering row.
   */
  private async getTransitionBuffer(offeringId: string): Promise<number> {
    const { rows } = await this.db.query<{ transition_buffer_min: number }>({
      sql: `SELECT transition_buffer_min FROM service_offering WHERE id = ?`,
      params: [offeringId],
    });
    return rows[0]?.transition_buffer_min ?? 15;
  }

  /**
   * Expire active slot holds that have passed their TTL.
   * Called by a cron-like trigger; placeholder for Slice 3.
   */
  async expireSlotHolds(now: Date): Promise<{ expired: number }> {
    const nowIso = now.toISOString();
    const { rows } = await this.db.query<{ id: string; booking_id: string; slot_id: string }>({
      sql: `SELECT id, booking_id, slot_id FROM slot_hold
            WHERE state = 'active' AND expires_at < ?`,
      params: [nowIso],
    });
    if (rows.length === 0) return { expired: 0 };
    const updates: { sql: string; params: unknown[] }[] = [];
    for (const r of rows) {
      updates.push({
        sql: `UPDATE slot_hold SET state = 'expired' WHERE id = ?`,
        params: [r.id],
      });
      updates.push({
        sql: `UPDATE booking SET state = 'expired', updated_at = ? WHERE id = ?`,
        params: [nowIso, r.booking_id],
      });
      updates.push({
        sql: `UPDATE capacity_reservation SET state = 'expired', released_at = ?
              WHERE parent_id = ? AND reservation_kind = 'slot_hold'`,
        params: [nowIso, r.id],
      });
    }
    await this.db.batch(updates);
    return { expired: rows.length };
  }

  /** Read-only helpers used by integration tests / Admin UI. */
  async getBooking(bookingId: string): Promise<unknown | null> {
    const { rows } = await this.db.query<unknown>({
      sql: `SELECT * FROM booking WHERE id = ?`,
      params: [bookingId],
    });
    return rows[0] ?? null;
  }

  /**
   * Confirm a booking after a verified payment proof (ADR 0097).
   *
   * Atomic transition:
   *   - booking.state → 'confirmed'
   *   - slot_hold.state → 'consumed' (if a hold exists)
   *   - capacity_reservation (slot_hold) → 'confirmed'
   *
   * Idempotent: if booking.state is already 'confirmed', this is a no-op
   * and returns { alreadyConfirmed: true }.
   *
   * The payment_proof row must already be in status='verified' before this
   * is called (enforced by callers via WhatsAppManualPaymentModule.verifyPayment).
   * This method only flips booking/slot/capacity state.
   */
  async confirmPayment(
    bookingId: string,
    _paymentProofId: string
  ): Promise<{ confirmed: boolean; alreadyConfirmed: boolean }> {
    const { rows } = await this.db.query<{ state: string }>({
      sql: `SELECT state FROM booking WHERE id = ?`,
      params: [bookingId],
    });
    const row = rows[0];
    if (!row) throw new Error(`booking ${bookingId} not found`);
    if (row.state === "confirmed") {
      return { confirmed: true, alreadyConfirmed: true };
    }
    if (row.state !== "pending_manual_payment" && row.state !== "awaiting_confirmation") {
      throw new Error(
        `booking ${bookingId} is in state '${row.state}'; cannot confirm`
      );
    }
    const now = new Date().toISOString();
    await this.db.batch([
      {
        sql: `UPDATE booking
              SET state = 'confirmed', updated_at = ?
              WHERE id = ? AND state IN ('pending_manual_payment','awaiting_confirmation')`,
        params: [now, bookingId],
      },
      {
        sql: `UPDATE slot_hold
              SET state = 'consumed'
              WHERE booking_id = ? AND state = 'active'`,
        params: [bookingId],
      },
      {
        sql: `UPDATE capacity_reservation
              SET state = 'confirmed'
              WHERE reservation_kind = 'slot_hold'
                AND parent_id IN (SELECT id FROM slot_hold WHERE booking_id = ?)
                AND state = 'hold_active'`,
        params: [bookingId],
      },
    ]);
    return { confirmed: true, alreadyConfirmed: false };
  }
}