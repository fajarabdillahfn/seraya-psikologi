# 73. Standard Counseling Session Duration

## Status

Accepted for launch planning.

## Context

SERAYA PULANG counseling is bookable online and offline at launch. Slot generation and availability need a concrete duration, while the domain already has a separate TransitionBuffer concept.

## Decision

The standard duration for one psychological counseling session is **60 minutes** for both online and offline modes. The existing default 15-minute TransitionBuffer remains separate from the session duration and is used for psychologist scheduling/slot overlap protection.

The 60-minute duration is captured in the ServiceOffering/ServiceOfferingRevision and OfferSnapshot. A future mode-specific duration requires a new offering revision or explicit catalog decision; it must not silently alter confirmed appointments.

## Consequences

- one consistent session duration simplifies launch catalog and booking UX;
- online and offline slots use the same base duration;
- psychologist availability must account for 60 minutes plus the configured transition buffer;
- duration changes require revision/regeneration rules and do not mutate historical appointments.

## Open follow-up

Define price per mode, psychologist assignment, availability, offline venue, booking cutoff, package structure, and whether a future assessment or specialized counseling variant needs a different duration.
