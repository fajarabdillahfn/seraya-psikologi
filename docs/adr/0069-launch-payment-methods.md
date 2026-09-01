# 69. Keep Launch Payment Methods Minimal

## Status

**Superseded for MVP launch; the payment method categories are retained but delivered as off-platform manual settlement per [ADR 0097](../0097-whatsapp-manual-payment.md).** Launch methods (`bank_transfer`, `va`, `qris_manual`) are paid directly to Seraya's bank account / VA number / static QRIS — the client receives a PDF + plain-text invoice via WhatsApp and an Admin verifies the payment proof in the Admin workspace. No payment gateway is involved in the launch path.

## Context

Seraya needs a small, testable payment surface for Indonesia-first single-session and full-upfront package purchases. Enabling every available method increases payment expiry variants, webhook cases, fee reconciliation, refund coverage questions, and UAT scope before the business has validated demand.

## Decision

Enable only:

- **QRIS**;
- **bank transfer / Virtual Account**.

Defer e-wallet, card, OTC/retail, BNPL, direct debit, and other Midtrans methods beyond launch unless an explicit business need and capability evidence justify adding them. The method categories are product scope; exact provider method codes and activated banks are implementation/onboarding details that must be verified before production exposure.

RefundAction must support the enabled methods' actual refund capabilities. If a method does not support the required refund path, Admin records the appropriate pending/failed/no-refund outcome rather than pretending all methods have identical refund behavior.

## Consequences

Positive:

- smaller checkout and UAT surface;
- fewer fee/refund/reconciliation variants;
- QRIS covers scan-based payment while VA covers bank-transfer users;
- later method additions remain explicit and measurable.

Costs and constraints:

- some clients may prefer e-wallet or cards;
- exact VA bank availability depends on Midtrans merchant activation;
- method-specific expiry and refund behavior still need sandbox evidence;
- adding a method later requires notification, reconciliation, and regression coverage.

## Open follow-up

Verify Midtrans onboarding, exact QRIS/VA activation and limits, payment expiry, fees, refund support, webhook payloads, and sandbox test cases. Record any method addition as a scope change.
