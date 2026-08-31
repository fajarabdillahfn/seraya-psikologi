# 5. Payment Success Gates Appointment Confirmation

## Status

Accepted; hold TTL is resolved by ADR 0014, payment truth by ADR 0023, late-success reconciliation by ADR 0059, cancellation review by ADR 0024/0025, and flexible manual WhatsApp support by ADR 0066. Exact Admin resolution/SLA/refund timing remains open.

## Context

A selected slot must not become a confirmed appointment merely because a browser reached a payment page or redirect URL. Payment gateways can retry, send late webhooks, or disagree temporarily with client-side state. At the same time, an unbounded hold would block availability.

## Decision

For self-serve online booking:

1. The client selects an AvailabilitySlot.
2. The system creates a pending Booking and a time-limited SlotHold.
3. The system initiates Payment.
4. Only verified, idempotently processed payment success may create/confirm the Appointment.
5. Payment failure or hold expiry releases the SlotHold and marks the active checkout/hold attempt expired or non-confirmed. It does not by itself settle Payment, decide the final Booking/Appointment outcome, or classify a later verified PaymentEvent; late success enters an explicit reconciliation/exception flow.

Frontend redirect success is not sufficient authority. SlotHold TTL is 10 minutes and configurable (ADR 0014); payment truth is a signed, server-verified webhook/PaymentEvent (ADR 0023). Midtrans + Snap is the launch provider/surface under ADR 0068 with QRIS + bank transfer/VA under ADR 0069; method activation, late verified success after expiry, and staff manual-payment exceptions remain open.

## Consequences

Positive:

- the confirmed Appointment has a clear business trigger;
- double booking and false-positive payment states are easier to prevent;
- retries and late webhooks can be handled without creating duplicate appointments;
- payment and appointment histories remain auditable.

Costs and constraints:

- the system needs an idempotency key and a reconciliation path;
- a payment page may expire while the client still believes they are booking;
- UX must explain hold expiry and offer a safe restart;
- manual/WhatsApp bookings need an explicit state transition rather than an operator-side shortcut.

## Open follow-up

Choose activated payment methods, late-success behavior after expiry, and whether staff can manually confirm an appointment with a recorded payment exception. Midtrans + Snap provider selection is resolved by ADR 0068; provider-specific signature/API verification, refund, and reconciliation details remain separate follow-up.
