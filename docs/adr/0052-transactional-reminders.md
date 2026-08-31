# 52. Include Transactional Appointment Reminders

## Status

Accepted for the MVP working model; Appointment reminder offsets are resolved by ADR 0053 as 24 hours + 2 hours, with Asia/Jakarta rendering and reschedule/cancellation recomputation. Package-expiry offsets, opt-out/mandatory semantics, provider/retry policy, and failure/manual support remain open.

## Context

Booking confirmation alone is insufficient for an appointment scheduled days/weeks later or for later package sessions. Reminder delivery reduces missed operational commitments without requiring clinical data.

## Decision

Include transactional reminders in MVP for:

- upcoming Appointment;
- payment/Booking state where action is needed;
- schedule change/cancellation decision;
- package validity/remaining-session expiry where useful.

ReminderSchedule/Notification is derived from Appointment/PackagePurchase state and delivered through the email-primary channel. Reschedule, cancellation approval, expiry, or terminal outcome must cancel/recompute pending reminders. Content contains minimum non-clinical details: Seraya identity, service/psychologist as appropriate, local date/time/mode, scoped access link, and support path.

No marketing campaign or clinical advice notification is included.

## Consequences

Positive:

- fewer missed sessions and clearer guest experience;
- reminder state is explainable/auditable;
- reschedule/cancellation can update notifications safely;
- package clients get help using remaining entitlements.

Costs and constraints:

- scheduler/outbox and idempotent delivery are needed;
- time-zone and daylight boundary tests are required;
- stale reminder cancellation must be reliable;
- email content must avoid sensitive clinical details.

## Open follow-up

Choose package-expiry reminder offsets, opt-out/mandatory semantics, provider quotas/failure behavior, and manual support fallback. Appointment offsets and timezone source are resolved.
