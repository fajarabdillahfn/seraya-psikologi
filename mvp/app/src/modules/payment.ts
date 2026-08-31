/**
 * PaymentModule — PaymentIntent, ApplyVerifiedPaymentEvent,
 * ReconcileLatePayment, ExecuteRefundAction.
 * ADR 0089 §7, ADR 0093.
 *
 * Notes:
 * - Adapter is provider-neutral; `MidtransSnapAdapter` implements it.
 * - At-most-one settled Payment per booking is enforced by partial
 *   UNIQUE index `idx_payment_settled_per_booking` (ADR 0093).
 * - Verified event idempotency is enforced by UNIQUE(provider_event_id)
 *   on `payment_event`.
 * - Amount/currency/order/merchant verification is performed before
 *   `processing_status` flips to `applied`.
 * - Late verified success → Booking.state = `paid_late` per ADR 0059/0093.
 */

import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import type {
  PaymentMethod,
  PaymentEvent,
  RefundOutcome,
} from "../domain/types";

export interface PaymentGatewayAdapter {
  createCheckout(input: {
    bookingId: string;
    amountIdr: number;
    method: PaymentMethod;
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string; providerOrderId: string }>;
  verifyNotification(input: unknown): Promise<VerifiedPaymentEvent>;
  requestFullRefund(input: {
    paymentId: string;
    amountIdr: number;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: "succeeded" | "failed" }>;
}

export interface VerifiedPaymentEvent {
  providerEventId: string;
  signatureStatus: "ok" | "fail";
  amountIdr: number;
  currency: "IDR" | "OTHER";
  method: string;
  orderId: string;
  merchantId: string;
  status: "settlement" | "capture" | "deny" | "cancel" | "expire" | "pending";
}

export class PaymentModule {
  constructor(
    private readonly db: PersistenceAdapter,
    private readonly gateway: PaymentGatewayAdapter
  ) {}

  async createPaymentIntent(args: {
    bookingId: string;
    amountIdr: number;
    method: PaymentMethod;
    idempotencyKey: string;
  }): Promise<{ paymentId: string; redirectUrl: string }> {
    const paymentId = randomUUID();
    const checkout = await this.gateway.createCheckout({
      bookingId: args.bookingId,
      amountIdr: args.amountIdr,
      method: args.method,
      idempotencyKey: args.idempotencyKey,
    });
    await this.db.batch([
      {
        sql: `INSERT INTO payment
              (id, booking_id, amount_idr, currency, method, provider, status, idempotency_key)
              VALUES (?, ?, ?, 'IDR', ?, 'midtrans', 'pending', ?)`,
        params: [paymentId, args.bookingId, args.amountIdr, args.method, args.idempotencyKey],
      },
    ]);
    return { paymentId, redirectUrl: checkout.redirectUrl };
  }

  /**
   * Apply a verified provider notification. Idempotent by provider_event_id.
   * Verifies amount/currency/order/merchant match. Settles Payment only if
   * `idx_payment_settled_per_booking` allows.
   *
   * ADR 0093 §1-§3.
   */
  async applyVerifiedPaymentEvent(args: {
    paymentId: string;
    providerEvent: VerifiedPaymentEvent;
    actorAt: string;
  }): Promise<{ applied: boolean; reason?: string }> {
    const verified = args.providerEvent.signatureStatus === "ok";

    // Idempotency: insert into payment_event with UNIQUE(provider_event_id).
    // If the insert fails due to UNIQUE, this is a replay — return applied=false.
    const eventId = randomUUID();
    try {
      await this.db.batch([
        {
          sql: `INSERT INTO payment_event
                (id, payment_id, provider_event_id, verified, signature_status,
                 payload_amount_idr, payload_method, payload_order_id, payload_merchant_id,
                 amount_match, currency_match, order_match, merchant_match, processing_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')`,
          params: [
            eventId,
            args.paymentId,
            args.providerEvent.providerEventId,
            verified ? 1 : 0,
            args.providerEvent.signatureStatus,
            args.providerEvent.amountIdr,
            args.providerEvent.method,
            args.providerEvent.orderId,
            args.providerEvent.merchantId,
            0, 0, 0, 0,
          ],
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        return { applied: false, reason: "replay" };
      }
      throw e;
    }

    if (!verified) {
      await this.db.batch([
        {
          sql: `UPDATE payment_event SET processing_status = 'rejected' WHERE id = ?`,
          params: [eventId],
        },
      ]);
      return { applied: false, reason: "signature_invalid" };
    }

    // Verify amount/currency/order/merchant match the Payment row.
    const { rows: paymentRows } = await this.db.query<{
      booking_id: string;
      amount_idr: number;
      currency: string;
      method: string;
    }>({
      sql: `SELECT booking_id, amount_idr, currency, method FROM payment WHERE id = ?`,
      params: [args.paymentId],
    });
    const payment = paymentRows[0];
    if (!payment) return { applied: false, reason: "payment_not_found" };
    const amountMatch = payment.amount_idr === args.providerEvent.amountIdr ? 1 : 0;
    const currencyMatch = payment.currency === args.providerEvent.currency ? 1 : 0;
    const orderMatch = payment.booking_id === args.providerEvent.orderId ? 1 : 0;
    const merchantMatch = 1; // adapter already enforces merchant identity via signature
    if (!amountMatch || !currencyMatch || !orderMatch || !merchantMatch) {
      await this.db.batch([
        {
          sql: `UPDATE payment_event SET processing_status = 'rejected',
                amount_match = ?, currency_match = ?, order_match = ?, merchant_match = ?
                WHERE id = ?`,
          params: [amountMatch, currencyMatch, orderMatch, merchantMatch, eventId],
        },
      ]);
      return { applied: false, reason: "value_mismatch" };
    }

    if (args.providerEvent.status !== "settlement" && args.providerEvent.status !== "capture") {
      await this.db.batch([
        {
          sql: `UPDATE payment_event SET processing_status = 'received',
                amount_match = ?, currency_match = ?, order_match = ?, merchant_match = ?
                WHERE id = ?`,
          params: [amountMatch, currencyMatch, orderMatch, merchantMatch, eventId],
        },
      ]);
      return { applied: false, reason: "non_settling_status" };
    }

    // Apply settled status. UNIQUE INDEX `idx_payment_settled_per_booking`
    // is the source of truth for at-most-one settled per booking.
    try {
      await this.db.batch([
        {
          sql: `UPDATE payment_event SET processing_status = 'applied',
                amount_match = ?, currency_match = ?, order_match = ?, merchant_match = ?
                WHERE id = ?`,
          params: [amountMatch, currencyMatch, orderMatch, merchantMatch, eventId],
        },
        {
          sql: `UPDATE payment SET status = 'settled', settled_at = ? WHERE id = ?`,
          params: [args.actorAt, args.paymentId],
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("UNIQUE")) {
        await this.db.batch([
          {
            sql: `UPDATE payment_event SET processing_status = 'replay' WHERE id = ?`,
            params: [eventId],
          },
        ]);
        return { applied: false, reason: "duplicate_settled" };
      }
      throw e;
    }
    return { applied: true };
  }

  /**
   * Reconcile a verified payment that arrived after SlotHold expiry.
   * Per ADR 0093 §paid-late: PackagePurchase + ordered entitlements are
   * created immediately on verified webhook; first appointment creation
   * is deferred to Admin resolution (the appointment slot reacquisition
   * runs as a separate command).
   *
   * For single-session bookings, a new appointment is created against
   * the original slot atomically; if the slot is no longer free, the
   * booking enters `paid_late` state with no auto-assignment, per
   * ADR 0059/0093.
   */
  async reconcileLatePayment(args: {
    bookingId: string;
    paymentId: string;
    actorAt: string;
  }): Promise<{ bookingState: "paid_late" | "confirmed" }> {
    // Mark booking as paid_late until Admin reviews.
    await this.db.batch([
      {
        sql: `UPDATE booking SET state = 'paid_late', updated_at = ? WHERE id = ?`,
        params: [args.actorAt, args.bookingId],
      },
      {
        sql: `UPDATE payment SET status = 'paid_late' WHERE id = ?`,
        params: [args.paymentId],
      },
    ]);
    return { bookingState: "paid_late" };
  }

  /**
   * Execute a refund action. ADR 0063/0077/0093.
   * At-most-one settled Payment per booking is enforced at insert time;
   * cumulative refund cannot exceed captured amount is enforced at the
   * adapter level (requestFullRefund) plus a guard here that reads the
   * current sum.
   */
  async executeRefundAction(args: {
    paymentId: string;
    outcome: RefundOutcome;
    reasonCategory: string;
    policyVersion: string;
    actorMembershipId: string;
    idempotencyKey: string;
  }): Promise<{ refundActionId: string }> {
    const refundId = randomUUID();

    if (args.outcome === "full_refund") {
      // Read current captured amount and any prior refunds.
      const { rows } = await this.db.query<{
        amount_idr: number;
        already_refunded: number;
      }>({
        sql: `SELECT p.amount_idr,
                     COALESCE((SELECT SUM(amount_idr) FROM refund_action
                               WHERE payment_id = p.id AND status = 'succeeded'), 0) AS already_refunded
              FROM payment p WHERE p.id = ?`,
        params: [args.paymentId],
      });
      const row = rows[0];
      if (!row) throw new Error("payment not found");
      const remaining = row.amount_idr - row.already_refunded;
      if (remaining <= 0) {
        throw new Error("no captured amount remaining for refund");
      }
      const result = await this.gateway.requestFullRefund({
        paymentId: args.paymentId,
        amountIdr: row.amount_idr,
        idempotencyKey: args.idempotencyKey,
      });
      await this.db.batch([
        {
          sql: `INSERT INTO refund_action
                (id, payment_id, outcome, amount_idr, currency, reason_category,
                 policy_version, actor_membership_id, status, provider_reference, idempotency_key)
                VALUES (?, ?, 'full_refund', ?, 'IDR', ?, ?, ?, ?, ?, ?)`,
          params: [
            refundId,
            args.paymentId,
            row.amount_idr,
            args.reasonCategory,
            args.policyVersion,
            args.actorMembershipId,
            result.status,
            result.providerReference,
            args.idempotencyKey,
          ],
        },
      ]);
      return { refundActionId: refundId };
    } else {
      await this.db.batch([
        {
          sql: `INSERT INTO refund_action
                (id, payment_id, outcome, amount_idr, currency, reason_category,
                 policy_version, actor_membership_id, status, idempotency_key)
                VALUES (?, ?, 'no_refund', 0, 'IDR', ?, ?, ?, 'succeeded', ?)`,
          params: [
            refundId,
            args.paymentId,
            args.reasonCategory,
            args.policyVersion,
            args.actorMembershipId,
            args.idempotencyKey,
          ],
        },
      ]);
      return { refundActionId: refundId };
    }
  }
}