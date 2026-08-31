# 1. Separate Booking from Appointment

## Status

Accepted for the base distinction; the original one-to-one MVP cardinality is superseded in part by ADR 0016, which allows multi-session packages.

## Context

The technical PRD covers availability, booking, payment, and a future need for cancellation, expiry, retries, and possibly rescheduling. The term “booking” can mean both a client request and a calendar commitment. Using one entity for both would force payment and scheduling states into one overloaded lifecycle.

The MVP is a booking-and-payment platform, not a clinical record system.

## Decision

Model these concepts separately:

- **Booking** is the client-facing request/process.
- **Appointment** is the concrete scheduled commitment.
- **AvailabilitySlot** is bookable capacity before it is claimed.
- **Payment** is the financial transaction/attempt related to a Booking.

For the release, a Booking may represent a single-session purchase or a multi-session package. A single-session Booking produces one Appointment; a package Booking can relate to multiple Appointment instances. The package's session entitlement, scheduling, expiry, and refund semantics are specified separately and must not collapse Booking and Appointment into one overloaded entity.

## Consequences

Positive:

- payment timeout, late webhook, and retry states do not corrupt schedule state;
- cancellation/refund and rescheduling have a place to live;
- slot hold and appointment confirmation can be reasoned about separately;
- the model can reject clinical data instead of making Booking a catch-all record.

Costs:

- more tables/types and explicit transitions;
- the API must define how Booking, Appointment, Slot, and Payment are correlated;
- UAT must test failure paths across more than one lifecycle.

## Open follow-up

The next decision is whether a client is an authenticated account, a guest identity, or both in MVP. That choice affects Booking ownership, notification delivery, and data retention.
