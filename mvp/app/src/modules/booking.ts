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
const BOOKING_CUTOFF_MINUTES = 120;

// Launch accepts Indonesian mobile WhatsApp numbers only. Input may be
// normalized upstream; this rule validates the canonical E.164 shape.
const INDONESIAN_E164_PHONE = /^\+628[1-9][0-9]{6,11}$/;

export function normalizeIndonesianPhone(input: string): string {
  const compact = input.trim().replace(/[\s\-().]/g, "");
  if (compact.startsWith("08")) return `+62${compact.slice(1)}`;
  if (compact.startsWith("628")) return `+${compact}`;
  return compact;
}

function isValidIndonesianPhone(phone: string): boolean {
  return INDONESIAN_E164_PHONE.test(phone);
}

function calculateAgeOnDate(dateOfBirth: string, now: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) {
    throw new DomainError(IntakeErrors.OutOfScope, "date_of_birth invalid");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    throw new DomainError(IntakeErrors.OutOfScope, "date_of_birth invalid");
  }
  const jakartaNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let age = jakartaNow.getUTCFullYear() - year;
  const birthdayPassed = jakartaNow.getUTCMonth() + 1 > month ||
    (jakartaNow.getUTCMonth() + 1 === month && jakartaNow.getUTCDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age;
}

const CLINICAL_BLOCKLIST: RegExp[] = [
  /(bunuh diri|suicide|kill myself|ending my life|不想活)/i,
  /(self[- ]harm|self harm|melukai diri)/i,
  /(darurat|emergency|panic attack|serangan panik)/i,
];

export interface IntakeInput {
  displayName: string;
  contactEmail: string;
  contactPhone: string;
  dateOfBirth: string;
  consentVersion: string;
  crisisAck: boolean;
  topics: string[];
  problemDescription: string;
  expectedOutcome: string;
  returningClient: boolean;
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
    if (!input.contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
      throw new DomainError(IntakeErrors.MissingEmail, "contact_email invalid");
    }
    const normalizedPhone = normalizeIndonesianPhone(input.contactPhone ?? "");
    if (!normalizedPhone || !isValidIndonesianPhone(normalizedPhone)) {
      throw new DomainError(IntakeErrors.InvalidPhone, "contact_phone invalid");
    }
    if (!input.dateOfBirth) {
      throw new DomainError(IntakeErrors.OutOfScope, "date_of_birth required");
    }
    if (!input.consentVersion) {
      throw new DomainError(IntakeErrors.InvalidConsentVersion, "consent_version required");
    }
    if (!input.crisisAck) {
      throw new DomainError(IntakeErrors.CrisisAckNotSet, "crisis disclaimer must be acknowledged");
    }
    if (!Array.isArray(input.topics) || input.topics.length === 0 || input.topics.length > 5) {
      throw new DomainError(IntakeErrors.ClinicalNarrative, "topics required");
    }
    const problemDescription = input.problemDescription.trim();
    if (problemDescription.length < 50 || problemDescription.length > 2000) {
      throw new DomainError(IntakeErrors.ClinicalNarrative, "problem_description must be 50-2000 characters");
    }
    const expectedOutcome = input.expectedOutcome.trim();
    if (!expectedOutcome || expectedOutcome.length > 1000) {
      throw new DomainError(IntakeErrors.ClinicalNarrative, "expected_outcome required");
    }
    for (const narrative of [problemDescription, expectedOutcome]) {
      if (CLINICAL_BLOCKLIST.some((re) => re.test(narrative))) {
        throw new DomainError(IntakeErrors.ClinicalNarrative, "intake contains clinical or crisis content");
      }
    }

    // Booking cutoff: reject at or inside slot_start - 120 minutes.
    const cutoffAt = new Date(slotStartsAtUtc).getTime() - BOOKING_CUTOFF_MINUTES * 60 * 1000;
    if (now.getTime() >= cutoffAt) { // exact cutoff is closed
      throw new DomainError(IntakeErrors.CutoffTooLate, "booking is past the cutoff window");
    }

    // Age is a calendar calculation in Asia/Jakarta; no 365.25-day approximation.
    const age = calculateAgeOnDate(input.dateOfBirth, now);
    if (age < 18) {
      throw new DomainError(IntakeErrors.OutOfScope, "client must be 18 or older");
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
    if (audienceMatch !== "eligible_18_40") {
      throw new DomainError(IntakeErrors.OutOfScope, "client must be 18 or older");
    }

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
      now: new Date(),
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
               intake_topics, intake_problem_description, intake_expected_outcome,
               intake_returning_client, intake_short_message, crisis_ack)
              VALUES (?, ?, ?, 'pending_manual_payment', 0, 0, ?, ?, ?, ?, NULL, ?)`,
        params: [
          bookingId,
          args.clientId,
          args.offerSnapshotId,
          JSON.stringify(args.intake.topics),
          args.intake.problemDescription.trim(),
          args.intake.expectedOutcome.trim(),
          args.intake.returningClient ? 1 : 0,
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
   * Create a slot hold without the full intake. Used by the slot-pick action
   * to reserve the seat for 10 minutes before intake submission.
   *
   * - Reuses booking.state = 'pending_manual_payment' so existing admin
   *   flows (payment verified → confirmed) keep working without schema change.
   * - Returns the existing bookingId/holdId if a non-expired hold already
   *   exists for the same client + slot (idempotent on second click).
   */
  async createSlotHoldOnly(args: {
    clientId: string;
    offerSnapshotId: string;
    slotId: string;
    idempotencyKey: string;
    now?: Date;
  }): Promise<CreateBookingResult> {
    const now = args.now ?? new Date();
    const { rows: existing } = await this.db.query<{
      booking_id: string;
      hold_id: string;
      reservation_id: string;
      expires_at: string;
    }>({
      sql: `SELECT b.id AS booking_id, sh.id AS hold_id, cr.id AS reservation_id, sh.expires_at
            FROM slot_hold sh
            JOIN booking b ON b.id = sh.booking_id
            LEFT JOIN capacity_reservation cr ON cr.parent_id = sh.id AND cr.reservation_kind = 'slot_hold'
            WHERE sh.slot_id = ?
              AND sh.state = 'active'
              AND sh.expires_at > ?
              AND b.client_id = ?
              AND b.state = 'pending_manual_payment'
            ORDER BY sh.created_at DESC LIMIT 1`,
      params: [args.slotId, now.toISOString(), args.clientId],
    });
    if (existing[0]) {
      return {
        bookingId: existing[0].booking_id,
        slotHoldId: existing[0].hold_id,
        capacityReservationId: existing[0].reservation_id ?? "",
        expiresAt: existing[0].expires_at,
      };
    }

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
    if (!slot) throw new DomainError("E-SLOT-NOT-FOUND", "availability_slot not found or withdrawn");

    const startWithBuffer = new Date(
      new Date(slot.starts_at_utc).getTime() -
        (await this.getTransitionBuffer(slot.offering_id)) * 60 * 1000,
    ).toISOString();
    const endWithBuffer = new Date(
      new Date(slot.ends_at_utc).getTime() +
        (await this.getTransitionBuffer(slot.offering_id)) * 60 * 1000,
    ).toISOString();
    const available = await this.availability.isSlotAvailable({
      psychologistId: slot.psychologist_id,
      startsAtUtc: startWithBuffer,
      endsAtUtc: endWithBuffer,
      now,
    });
    if (!available) throw new DomainError("E-SLOT-UNAVAILABLE", "capacity overlap detected");

    const bookingId = randomUUID();
    const slotHoldId = randomUUID();
    const capacityReservationId = randomUUID();
    const expiresAt = new Date(now.getTime() + SLOT_HOLD_TTL_MINUTES * 60 * 1000).toISOString();

    await this.db.batch([
      {
        sql: `INSERT INTO booking
              (id, client_id, offer_snapshot_id, state, is_package, is_couple,
               intake_topics, intake_problem_description, intake_expected_outcome,
               intake_returning_client, intake_short_message, crisis_ack)
              VALUES (?, ?, ?, 'pending_manual_payment', 0, 0, '[]', NULL, NULL, 0, NULL, 0)`,
        params: [bookingId, args.clientId, args.offerSnapshotId],
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
        params: [capacityReservationId, slot.psychologist_id, slotHoldId, startWithBuffer, endWithBuffer],
      },
    ]);

    return { bookingId, slotHoldId, capacityReservationId, expiresAt };
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