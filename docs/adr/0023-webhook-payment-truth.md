# 23. Make Verified Gateway Webhook the Payment Truth Source

## Status

Accepted for launch planning; Midtrans + Snap is resolved by ADR 0068 and the initial QRIS + bank transfer/Virtual Account scope by ADR 0069. Exact Midtrans signature/API verification, event retention, retry/dead-letter handling, method-level refund behavior, and reconciliation cadence remain open.

## Context

Browser redirects can be interrupted, replayed, spoofed, or arrive before/after gateway settlement. A payment-gated Booking must not confirm an Appointment based on client-side claims.

## Decision

Use the gateway's signed webhook, with server-side verification, as the source of truth for payment state transitions. Record a PaymentEvent with provider event ID, verification outcome, processing status, and correlation. Process events idempotently; duplicate events must not create duplicate Appointment/entitlement confirmations.

Browser redirect is informational only. It may show a pending/success view and ask the server for current state, but it cannot directly mutate Payment, Booking, or Appointment truth.

## Consequences

Positive:

- payment confirmation is server-authoritative;
- duplicate/late webhook handling has a first-class event record;
- client manipulation cannot confirm an appointment;
- reconciliation can compare Payment with gateway events.

Costs and constraints:

- webhook endpoint security and signature verification are required;
- gateway outages/late events need pending states and recovery;
- raw payload retention/redaction must be defined;
- UAT must simulate duplicate, out-of-order, invalid, and late events.

## Open follow-up

Choose provider-specific signature/API verification, event retention, retry/dead-letter handling, and reconciliation cadence. Late success after SlotHold expiry is resolved by ADR 0059.
