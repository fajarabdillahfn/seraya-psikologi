# 3. Use Shared Services with Psychologist-level Offerings

## Status

Accepted for the MVP working model; psychologist-specific offering cardinality is resolved by ADR 0018. Approved override fields and snapshot timing are resolved by ADR 0042/0043; publication lifecycle and immutable revisions by ADR 0044/0045. Actual catalog values remain owned by the non-technical PRD; shared offerings across psychologists are deferred.

## Context

The team has a small fixed set of psychologists, but price, duration, mode, or eligibility may eventually differ by psychologist. A single global service row would make those differences awkward; five independent catalogs would make the public experience and administration inconsistent.

The technical model needs to distinguish the public category a visitor understands from the concrete thing that can be booked.

## Decision

Model two levels:

- **Service** is the canonical public category with shared defaults.
- **ServiceOffering** is the psychologist-specific bookable variant and carries the effective values used for booking.

A ServiceOffering may inherit a default from Service or explicitly override it. A Booking targets exactly one ServiceOffering. The non-technical PRD remains the authority for the actual catalog, prices, durations, and policy rules.

## Consequences

Positive:

- public taxonomy stays consistent;
- psychologist-specific differences are representable without duplicating the catalog;
- future pricing/duration changes can be scoped deliberately;
- booking always points to an unambiguous bookable configuration.

Costs and constraints:

- effective-value precedence must be defined;
- admin UI must make inherited versus overridden values visible;
- changes to offering price/duration must not silently rewrite historical bookings;
- service and offering publication/archival states need lifecycle rules.

## Open follow-up

Define the implementation mapping for approved overrides, OfferSnapshot fields, and revision activation/rollback/future-slot handling. Actual service prices, durations, and policy values belong to the non-technical PRD. A shared offering across multiple psychologists is deferred beyond the MVP.
