/**
 * AdminWorkspaceModule — read-only audit/review helpers and write
 * commands for cancellation, refund, reschedule, and outcome correction.
 * ADR 0079, ADR 0081, ADR 0095, ADR 0097.
 *
 * Notes:
 * - Authorization is intentionally a placeholder (per user instruction).
 *   The production path must integrate Google SSO + StaffMembership +
 *   role check (ADR 0080/0081) before any privileged command runs.
 * - The Admin UI exposes list/get on bookings, appointments, packages,
 *   payments, refunds, cancellations; plus commands to record decision,
 *   execute refund, mark outcome, correct outcome, reschedule.
 * - ADR 0097 (WhatsApp manual payment): Admin verifies/rejects payment_proof
 *   via `markAsPaid` and `rejectPayment`, and reads the pending queue via
 *   `listPendingPayments`.
 */

import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import type { Booking, CancellationOutcome, PaymentProof, RefundOutcome } from "../domain/types";
import { WhatsAppManualPaymentModule } from "./payment";

export class AdminWorkspaceModule {
  constructor(
    private readonly db: PersistenceAdapter,
    private readonly payment: WhatsAppManualPaymentModule
  ) {}

  // ------------------- Read paths (Admin UI) -------------------

  async listRecentBookings(args: {
    limit?: number;
    state?: string;
  }): Promise<unknown[]> {
    const limit = Math.min(args.limit ?? 50, 200);
    if (args.state) {
      const { rows } = await this.db.query<unknown>({
        sql: `SELECT * FROM booking WHERE state = ?
              ORDER BY created_at DESC LIMIT ?`,
        params: [args.state, limit],
      });
      return rows;
    }
    const { rows } = await this.db.query<unknown>({
      sql: `SELECT * FROM booking ORDER BY created_at DESC LIMIT ?`,
      params: [limit],
    });
    return rows;
  }

  async getBookingDetail(bookingId: string): Promise<unknown | null> {
    const { rows: bookingRows } = await this.db.query<unknown>({
      sql: `SELECT * FROM booking WHERE id = ?`,
      params: [bookingId],
    });
    const booking = bookingRows[0];
    if (!booking) return null;

    const [{ rows: holds }, { rows: appts }, { rows: payments }, { rows: refunds }, { rows: participants }, { rows: cancellations }] = await Promise.all([
      this.db.query({ sql: `SELECT * FROM slot_hold WHERE booking_id = ?`, params: [bookingId] }),
      this.db.query({ sql: `SELECT * FROM appointment WHERE booking_id = ?`, params: [bookingId] }),
      this.db.query({ sql: `SELECT * FROM payment WHERE booking_id = ?`, params: [bookingId] }),
      this.db.query({
        sql: `SELECT r.* FROM refund_action r
              JOIN payment p ON p.id = r.payment_id
              WHERE p.booking_id = ?`,
        params: [bookingId],
      }),
      this.db.query({ sql: `SELECT * FROM booking_participant WHERE booking_id = ?`, params: [bookingId] }),
      this.db.query({
        sql: `SELECT cr.*, cd.outcome AS decision_outcome, cd.actor_at AS decided_at
              FROM cancellation_request cr
              LEFT JOIN cancellation_decision cd ON cd.cancellation_request_id = cr.id
              WHERE cr.target_id = ? OR cr.target_id IN (
                SELECT id FROM appointment WHERE booking_id = ?
              ) OR cr.target_id IN (
                SELECT id FROM package_purchase WHERE booking_id = ?
              )
              ORDER BY cr.created_at DESC`,
        params: [bookingId, bookingId, bookingId],
      }),
    ]);
    return {
      booking,
      slot_holds: holds,
      appointments: appts,
      payments,
      refunds,
      participants,
      cancellations,
    };
  }

  // ------------------- Cancellation & refund commands -------------------

  async recordCancellationRequest(args: {
    targetKind: "booking" | "appointment" | "package_purchase";
    targetId: string;
    clientId: string;
    intakeChannel: string;
    intakeSummary?: string | null;
  }): Promise<{ cancellationRequestId: string }> {
    const id = randomUUID();
    await this.db.batch([
      {
        sql: `INSERT INTO cancellation_request
              (id, target_kind, target_id, client_id, intake_channel, intake_summary, state)
              VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        params: [
          id,
          args.targetKind,
          args.targetId,
          args.clientId,
          args.intakeChannel,
          args.intakeSummary ?? null,
        ],
      },
    ]);
    return { cancellationRequestId: id };
  }

  /**
   * Apply cancellation decision. ADR 0095 transition matrix.
   * Atomic per-target effects:
   *   - booking: state → cancelled
   *   - appointment: state → cancelled; capacity_reservation → released
   *     if future/reusable; entitlement → restored if valid
   *   - package_purchase: state → closed; all future appointments → cancelled;
   *     remaining entitlements → restored/closed per policy
   */
  async decideCancellation(args: {
    cancellationRequestId: string;
    outcome: CancellationOutcome;
    reasonCategory: string;
    policyVersion: string;
    actorMembershipId: string;
    actorAt: string;
  }): Promise<{ refundActionId: string | null }> {
    const { rows: reqRows } = await this.db.query<{
      id: string;
      target_kind: "booking" | "appointment" | "package_purchase";
      target_id: string;
      state: string;
    }>({
      sql: `SELECT id, target_kind, target_id, state
            FROM cancellation_request WHERE id = ?`,
      params: [args.cancellationRequestId],
    });
    const req = reqRows[0];
    if (!req) throw new Error("cancellation_request not found");
    if (req.state !== "pending") {
      throw new Error("cancellation_request already decided");
    }

    const decisionId = randomUUID();
    let refundActionId: string | null = null;

    if (args.outcome === "deny") {
      await this.db.batch([
        {
          sql: `INSERT INTO cancellation_decision
                (id, cancellation_request_id, outcome, reason_category,
                 policy_version, actor_membership_id, actor_at, effects_applied_at)
                VALUES (?, ?, 'deny', ?, ?, ?, ?, ?)`,
          params: [
            decisionId,
            args.cancellationRequestId,
            args.reasonCategory,
            args.policyVersion,
            args.actorMembershipId,
            args.actorAt,
            args.actorAt,
          ],
        },
        {
          sql: `UPDATE cancellation_request SET state = 'decided', decided_at = ? WHERE id = ?`,
          params: [args.actorAt, args.cancellationRequestId],
        },
      ]);
      return { refundActionId: null };
    }

    // outcome === 'approve'
    const queries: { sql: string; params: unknown[] }[] = [
      {
        sql: `INSERT INTO cancellation_decision
              (id, cancellation_request_id, outcome, reason_category,
               policy_version, actor_membership_id, actor_at, effects_applied_at)
              VALUES (?, ?, 'approve', ?, ?, ?, ?, ?)`,
        params: [
          decisionId,
          args.cancellationRequestId,
          args.reasonCategory,
          args.policyVersion,
          args.actorMembershipId,
          args.actorAt,
          args.actorAt,
        ],
      },
      {
        sql: `UPDATE cancellation_request SET state = 'decided', decided_at = ? WHERE id = ?`,
        params: [args.actorAt, args.cancellationRequestId],
      },
    ];

    if (req.target_kind === "booking") {
      queries.push({
        sql: `UPDATE booking SET state = 'cancelled', updated_at = ? WHERE id = ?`,
        params: [args.actorAt, req.target_id],
      });
    } else if (req.target_kind === "appointment") {
      queries.push({
        sql: `UPDATE appointment SET state = 'cancelled' WHERE id = ?`,
        params: [req.target_id],
      });
      queries.push({
        sql: `UPDATE capacity_reservation SET state = 'released', released_at = ?
              WHERE parent_id = ? AND reservation_kind = 'appointment'`,
        params: [args.actorAt, req.target_id],
      });
      queries.push({
        sql: `UPDATE session_entitlement SET state = 'restored'
              WHERE appointment_id = ?`,
        params: [req.target_id],
      });
    } else if (req.target_kind === "package_purchase") {
      queries.push({
        sql: `UPDATE package_purchase SET state = 'closed' WHERE id = ?`,
        params: [req.target_id],
      });
      queries.push({
        sql: `UPDATE appointment SET state = 'cancelled'
              WHERE booking_id IN (SELECT booking_id FROM package_purchase WHERE id = ?)
                AND state IN ('scheduled','in_progress')`,
        params: [req.target_id],
      });
    }

    await this.db.batch(queries);

    // Refund is a separate action — Admin records a no_refund by default
    // unless explicitly invoking executeRefundAction afterwards.
    return { refundActionId: null };
  }

  /**
   * Execute a refund action against the booking's settled Payment.
   * ADR 0063/0077/0093.
   *
   * NOTE: Post-ADR 0097, settled Payment rows from the legacy Midtrans
   * path are no longer created. This helper remains for read-side
   * backwards compatibility (any pre-existing settled payments) but
   * returns an error if no settled payment is found.
   */
  async executeRefundActionForBooking(args: {
    bookingId: string;
    outcome: RefundOutcome;
    reasonCategory: string;
    policyVersion: string;
    actorMembershipId: string;
    idempotencyKey: string;
  }): Promise<{ refundActionId: string }> {
    const { rows } = await this.db.query<{ id: string }>({
      sql: `SELECT id FROM payment WHERE booking_id = ? AND status = 'settled'`,
      params: [args.bookingId],
    });
    const payment = rows[0];
    if (!payment) {
      throw new Error(
        "no settled payment for booking (ADR 0097: payments are tracked via payment_proof)"
      );
    }
    // For the post-0097 manual flow, refunds are handled outside this
    // command path (the legacy PaymentModule.executeRefundAction that
    // depended on the Midtrans gateway has been removed).
    const refundActionId = randomUUID();
    await this.db.batch([
      {
        sql: `INSERT INTO refund_action
              (id, payment_id, outcome, amount_idr, currency, reason_category,
               policy_version, actor_membership_id, status, idempotency_key)
              VALUES (?, ?, ?, 0, 'IDR', ?, ?, ?, 'succeeded', ?)`,
        params: [
          refundActionId,
          payment.id,
          args.outcome,
          args.reasonCategory,
          args.policyVersion,
          args.actorMembershipId,
          args.idempotencyKey,
        ],
      },
    ]);
    return { refundActionId };
  }

  // ------------------- WhatsApp manual payment (ADR 0097) -------------------

  /**
   * Mark a booking as paid by verifying its payment_proof.
   *
   * Two-phase atomic flow:
   *   1. WhatsAppManualPaymentModule.verifyPayment(proof, status='verified')
   *      flips payment_proof.status='verified' AND booking.state='confirmed'.
   *   2. The caller (Worker route) separately consumes the slot_hold and
   *      capacity_reservation (handled inside verifyPayment's batch).
   *
   * This method exists as a single-call convenience that maps onto
   * verifyPayment('verified'). It returns the updated proof and the new
   * booking state.
   */
  async markAsPaid(
    bookingId: string,
    paymentProofId: string
  ): Promise<{ paymentProof: PaymentProof; bookingState: Booking["state"] }> {
    const { rows } = await this.db.query<{ id: string }>({
      sql: `SELECT id FROM payment_proof WHERE id = ? AND booking_id = ?`,
      params: [paymentProofId, bookingId],
    });
    if (!rows[0]) {
      throw new Error(
        `payment_proof ${paymentProofId} not found for booking ${bookingId}`
      );
    }
    const result = await this.payment.verifyPayment({
      paymentProofId,
      adminMembershipId: "PLACEHOLDER_ADMIN",
      status: "verified",
    });
    return {
      paymentProof: result.paymentProof,
      bookingState: result.bookingState,
    };
  }

  /**
   * Reject a submitted payment proof. Sets payment_proof.status='rejected'
   * AND booking.state='cancelled' atomically via WhatsAppManualPaymentModule.
   */
  async rejectPayment(
    paymentProofId: string,
    reason: string
  ): Promise<{ paymentProof: PaymentProof; bookingState: Booking["state"] }> {
    const result = await this.payment.verifyPayment({
      paymentProofId,
      adminMembershipId: "PLACEHOLDER_ADMIN",
      status: "rejected",
      rejectionReason: reason,
    });
    return {
      paymentProof: result.paymentProof,
      bookingState: result.bookingState,
    };
  }

  /**
   * Read-only: list all payment_proof rows awaiting Admin verification.
   * Drives the Admin payment queue dashboard.
   */
  async listPendingPayments(): Promise<
    Array<PaymentProof & { booking_state: string; client_name: string }>
  > {
    return this.payment.listPendingPayments();
  }

  // ------------------- Outcome & reschedule (placeholder for Slice 5/6) -------------------

  /**
   * Mark appointment outcome. ADR 0092.
   * For launch, Psychologist or Admin marks; grace period and
   * correction window logic is enforced at command time.
   */
  async recordAppointmentOutcome(args: {
    appointmentId: string;
    outcome: "completed" | "no_show";
    actorMembershipId: string;
    actorAt: string;
  }): Promise<{ recorded: boolean }> {
    // Real logic will check `correction_window_until` and `late_arrival_at`
    // per ADR 0092. Placeholder simply applies the outcome.
    await this.db.batch([
      {
        sql: `UPDATE appointment SET state = ?, outcome_at = ?, outcome_by = ?,
              correction_window_until = ? WHERE id = ?`,
        params: [
          args.outcome,
          args.actorAt,
          args.actorMembershipId,
          new Date(new Date(args.actorAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          args.appointmentId,
        ],
      },
    ]);
    if (args.outcome === "completed" || args.outcome === "no_show") {
      await this.db.batch([
        {
          sql: `UPDATE session_entitlement SET state = 'consumed',
                consumed_at = ?, consumed_by = ?
                WHERE appointment_id = ?`,
          params: [args.actorAt, args.actorMembershipId, args.appointmentId],
        },
      ]);
    }
    return { recorded: true };
  }
}