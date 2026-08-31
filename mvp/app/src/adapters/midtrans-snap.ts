/**
 * MidtransSnapAdapter — placeholder implementation of PaymentGatewayAdapter.
 * ADR 0089 §7, ADR 0093.
 *
 * NOTE: This is a placeholder stub for the MVP skeleton. The real
 * implementation is deferred until production onboarding (TBC-PAY-01).
 * For local development and tests, see `FakePaymentAdapter` in
 * `tests/integration/fake-adapter.ts`.
 *
 * Documented gaps (require production onboarding before launch):
 * - Server key loading from CF Workers Secrets
 * - Exact Snap method codes per launch payment categories
 * - Signature verification against Midtrans public key
 * - Webhook payload shape mapping
 * - Idempotency key naming convention with Midtrans
 * - Retry and dead-letter policy
 */

import type {
  PaymentGatewayAdapter,
  VerifiedPaymentEvent,
} from "../modules/payment";

export class MidtransSnapAdapter implements PaymentGatewayAdapter {
  constructor(private readonly opts: {
    serverKey: string;            // PLACEHOLDER: injected via env.MIDTRANS_SERVER_KEY in production
    isProduction: boolean;
  }) {
    if (!this.opts.serverKey) {
      throw new Error(
        "MidtransSnapAdapter requires serverKey. " +
          "Inject via CF Workers Secret env.MIDTRANS_SERVER_KEY before launch."
      );
    }
  }

  async createCheckout(_input: {
    bookingId: string;
    amountIdr: number;
    method: "qris" | "va";
    idempotencyKey: string;
  }): Promise<{ redirectUrl: string; providerOrderId: string }> {
    // PLACEHOLDER: real adapter issues a Snap transaction and returns the
    // hosted-checkout URL plus the Midtrans order_id. Until TBC-PAY-01
    // is closed (real Midtrans merchant onboarding, sandbox evidence,
    // webhook signature verification, fee/limit/refund verification),
    // the Worker rejects non-test calls with a typed error.
    throw new Error(
      "MidtransSnapAdapter is a placeholder until production onboarding. " +
        "Use FakePaymentAdapter for local dev/tests (TBC-PAY-01)."
    );
  }

  async verifyNotification(_input: unknown): Promise<VerifiedPaymentEvent> {
    // PLACEHOLDER: real adapter computes SHA-512 over the Midtrans body
    // using the server key and compares to the `signature_key` field.
    throw new Error(
      "MidtransSnapAdapter.verifyNotification is a placeholder until production onboarding."
    );
  }

  async requestFullRefund(_input: {
    paymentId: string;
    amountIdr: number;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: "succeeded" | "failed" }> {
    // PLACEHOLDER: real adapter calls Midtrans Refund API. Until
    // production onboarding is complete, refund flow runs through Admin
    // workspace with manual reconciliation.
    throw new Error(
      "MidtransSnapAdapter.requestFullRefund is a placeholder until production onboarding."
    );
  }
}