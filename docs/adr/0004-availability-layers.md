# 4. Model Availability as Rules, Exceptions, and Concrete Slots

## Status

Accepted for the MVP working model; psychologist-specific offering slots, 90-day generation horizon, 15-minute default buffer, published-only exposure, exception precedence, and unheld/held/booked regeneration boundaries are resolved by ADR 0013/0040/0041/0044/0061. Scheduler trigger/backfill and active-hold invalid-source resolution remain open.

## Context

The platform needs to publish bookable availability for five psychologists while supporting recurring schedules, leave, holidays, one-off changes, temporary slot holds, and concurrency. A single JSON availability blob would obscure lifecycle and make date-specific changes difficult to audit.

External calendar synchronization is not the MVP source of truth.

## Decision

Use three layers:

- **AvailabilityRule** stores recurring weekly schedule patterns.
- **AvailabilityException** stores date-specific additions, changes, or blocks.
- **AvailabilitySlot** is the concrete bookable capacity generated from the effective schedule for a finite horizon.

Booking and concurrency operate on AvailabilitySlot, not directly on rules. The generation horizon is 90 days by default, the transition buffer defaults to 15 minutes, slots belong to one ServiceOffering, and only published offerings expose new slots. AvailabilityException overrides AvailabilityRule for the same date/range; ADR 0061 governs regeneration and preservation of unheld, held, and Appointment-linked slots.

## Consequences

Positive:

- recurring schedules do not need to be re-entered every week;
- leave and one-off changes have a first-class place;
- slot holds and claims can be tracked independently from schedule intent;
- generation can be rerun for future dates without rewriting historical appointments.

Costs and constraints:

- generated slots need a regeneration/update policy;
- changes to rules must not silently alter already confirmed appointments;
- overlap, timezone, DST, and boundary semantics need explicit tests;
- the system needs an owner/runbook for generation failures.

## Open follow-up

Define scheduler trigger/backfill cadence and Admin resolution when an active hold's source becomes invalid. Rule/exception precedence and future-slot preservation/withdrawal are resolved by ADR 0061.
