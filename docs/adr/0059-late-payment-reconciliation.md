# 59. Reconcile Late Payment After SlotHold Expiry

## Status

Accepted for the MVP working model; exact admin resolution options, SLA, refund timing, and gateway reversal behavior remain open.

## Context

A signed/verified PaymentEvent can arrive after the 10-minute SlotHold has expired. Treating it as payment failure loses financial truth; automatically creating an Appointment risks double booking or assigning a different time without consent.

## Decision

When a verified payment success arrives after SlotHold expiry:

1. record Payment as paid and the checkout/Booking attempt as `paid_late`/reconciliation-required;
2. atomically check whether the original AvailabilitySlot is still free under current offering, buffer, and concurrency rules;
3. if it is free, reacquire the original slot and confirm the intended Appointment;
4. if it is not free, do not create or auto-assign another Appointment. Keep Payment paid-late and route it to an Admin resolution flow for refund, reversal, or a client-approved alternative.

The late event is idempotent by provider event ID/payment correlation. A browser redirect never changes this outcome. No silent refund or silent slot substitution occurs.

## Consequences

Positive:

- financial truth is preserved;
- the client's original intent is honored when safe;
- no accidental double booking or surprise reassignment;
- the unavailable-slot case is explicit and supportable.

Costs and constraints:

- `paid_late`/reconciliation state and Admin tooling are needed;
- atomic slot re-acquisition must share the normal overlap invariant;
- refund/reversal timing and communication need policy;
- gateway reconciliation must distinguish paid-late from failed payment.

## Open follow-up

Define Admin resolution SLA/options, client notification, refund/reversal timing, payment-method constraints, and whether a manually approved alternative requires a new Appointment or replacement action.
