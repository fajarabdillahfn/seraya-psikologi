# 68. Select Midtrans Snap for Launch Payments

## Status

**Superseded for MVP launch; kept as future option. WhatsApp manual payment is launch path per [ADR 0097](0097.html).** Midtrans Snap is no longer the launch payment path. The decision below describes the Midtrans option that may be reactivated post-MVP via a future ADR; the launch path is manual bank transfer / VA / QRIS off-platform with Admin "Mark as paid" verification in the Admin workspace.

## Context

Seraya's MVP needs one Indonesia-first online payment gateway for single-session and full-upfront package purchases. The domain already isolates provider details behind `PaymentGatewayAdapter`, treats signed server-verified webhook/PaymentEvent as authority, and records refunds as separate `RefundAction` records. The team has not previously integrated either Midtrans or Xendit.

## Decision

Use **Midtrans** as the launch gateway-of-record and **Snap** as the initial hosted checkout integration. The application creates the provider transaction through the adapter, directs the client to Snap, and never treats browser redirect success as payment confirmation. A verified Midtrans notification/webhook and reconciled `PaymentEvent` remain the authority for confirmation.

Keep the provider boundary intact so a future Xendit or other provider can be added without changing Booking, Appointment, Payment, PaymentEvent, or RefundAction domain semantics. Use Midtrans Core API only if a later requirement makes Snap's hosted checkout insufficient; it is not part of the launch assumption.

The launch method shortlist, merchant-account activation, provider limits, method-specific refund capability/fees, and reconciliation schedule must be verified before enabling production methods. Unsupported or unverified methods are not exposed merely because the provider offers them generally.

## Consequences

Positive:

- launch has one explicit provider and a relatively focused hosted-checkout path;
- checkout UI/payment handling stays small for the MVP;
- domain truth remains provider-neutral and webhook-driven;
- future provider substitution remains possible behind the adapter.

Costs and constraints:

- launch depends on Midtrans merchant onboarding and activated methods;
- Snap limits checkout customization compared with a direct API flow;
- refund behavior and fees still need method-level verification;
- provider notification verification, retry, and reconciliation must be implemented/tested.

## Open follow-up

Verify Midtrans onboarding, exact QRIS/VA activation and limits, payment expiry, fees, refund support, webhook payloads, retry/dead-letter, reconciliation cadence, and outage/manual-resolution handling. The launch method categories are resolved by ADR 0069.
