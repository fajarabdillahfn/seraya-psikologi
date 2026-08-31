# 13. Tie Availability Slots to Service Offerings

## Status

Accepted for the MVP working model; exact generation algorithm and overlap index/constraint remain implementation details to specify.

## Context

ServiceOfferings may have different effective durations, prices, modes, or eligibility. A shared generic time slot would require the booking flow to choose a service after selecting capacity and would make duration fit and pricing snapshots less explicit.

The same psychologist still cannot serve two overlapping bookings, even if the slots belong to different ServiceOfferings.

## Decision

An AvailabilitySlot belongs to one psychologist and one ServiceOffering for one concrete time range. Booking selects exactly one such slot. Enforce a provider-level invariant: active SlotHolds and confirmed/active Appointments for the same psychologist must not overlap, regardless of ServiceOffering.

## Consequences

Positive:

- a slot carries an unambiguous service/duration context;
- payment and confirmation can snapshot one concrete offering;
- the public booking flow has fewer ambiguous choices;
- cross-service double booking is explicitly prevented.

Costs and constraints:

- generation may create candidate slots per offering;
- overlapping candidate slots need a clear hold/claim strategy;
- offering changes must not rewrite already generated/claimed slot history;
- the database/API must enforce overlap atomically, not only in UI code.

## Open follow-up

Choose candidate slot granularity, generation ordering when offerings overlap, whether unpublished slots are generated, and the exact concurrency mechanism.
