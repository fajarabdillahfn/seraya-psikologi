# 41. Apply a Fifteen-minute Configurable Transition Buffer

## Status

Accepted for the MVP working model; default 15-minute value, per-offering configuration, overlap/concurrency application, and historical snapshot requirement are resolved by ADR 0041–0043. Exact before/after placement, storage mapping, and future-slot effects remain open.

## Context

A psychologist's availability window should not be treated as back-to-back appointment capacity without a transition interval. The buffer affects both generated candidate slots and the actual overlap/concurrency invariant; applying it only in UI would permit conflicting bookings.

## Decision

Use a default 15-minute TransitionBuffer for ServiceOffering scheduling. Admin may configure the effective buffer per offering. Generation, SlotHold, Appointment overlap checks, and reschedule slot claims must apply the effective buffer. The effective duration and buffer are snapshotted on the relevant Booking/PackagePurchase/Appointment so later offering edits do not rewrite historical schedule semantics.

The buffer is operational scheduling metadata and does not imply clinical notes.

## Consequences

Positive:

- slot display and booking enforcement agree;
- different offerings can use different operational assumptions;
- reschedule and package later-session flows reuse one invariant;
- historical records remain interpretable after configuration changes.

Costs and constraints:

- effective-value precedence (Service default vs offering override) is required;
- available capacity may be lower than raw window arithmetic;
- tests must cover boundary-touching intervals and different buffers;
- admin UI must make the effective buffer visible.

## Open follow-up

Define whether the buffer applies before, after, or both sides of an Appointment, exact persistence mapping, and how active/future slots react to changed effective values.
