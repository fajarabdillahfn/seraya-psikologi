# 11. Keep Rescheduling Administrative and Audited

## Status

Accepted for the MVP working model; replacement, same-payment, and same-entitlement behavior are resolved by ADR 0039. Admin permission, policy cutoff, and notification details remain open.

## Context

Mutating an Appointment's time in place destroys the original schedule history and complicates slot release, notifications, payment reconciliation, and audit. Client self-service rescheduling adds another high-risk concurrency path before the basic booking lifecycle is proven.

## Decision

No client self-service rescheduling in MVP. An authorized admin may perform a RescheduleAction. The operation must preserve the original Appointment history and create/link an explicit replacement schedule/slot rather than silently overwriting the original time.

The action must be audited and should trigger the applicable schedule-change notification. ADR 0039 resolves the relation: the Booking remains the same, a replacement Appointment is created, package replacements reuse the same SessionEntitlement, and the existing Payment carries forward without a new charge.

## Consequences

Positive:

- original schedule history remains traceable;
- lower concurrency and authorization complexity for MVP;
- staff can handle exceptional cases with context;
- notification and payment behavior can be made explicit per action.

Costs and constraints:

- admin operations need a clear UI and reason field;
- client UX must explain how to request a change;
- replacement-slot availability must be checked atomically;
- audit and notification failures need recovery paths.

## Open follow-up

Define admin reschedule permissions, policy cutoff, client request channel, and exact status/event vocabulary. Replacement Appointment cardinality and payment/entitlement carry-forward are resolved by ADR 0039.
