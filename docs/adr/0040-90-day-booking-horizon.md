# 40. Generate Availability on a Rolling Ninety-day Horizon

## Status

Accepted for the MVP working model; 90-day rolling horizon, rule/exception source, and preservation of held/booked history are resolved by ADR 0040/0061. Exact generation trigger, backfill cadence, and publication controls remain open.

## Context

Recurring rules and exceptions are durable sources, while concrete AvailabilitySlot records are bookable capacity. Generating indefinitely creates unnecessary data and exposes dates the practice may not want to commit to; generating too little makes package follow-up scheduling frustrating.

## Decision

Use a rolling BookingHorizon of 90 days by default, configurable by Admin. Generate/expose offering-specific AvailabilitySlot instances only within the horizon and Asia/Jakarta operational semantics. The horizon moves forward as time passes; rules/exceptions are the source of truth and regeneration must not overwrite held/booked history.

## Consequences

Positive:

- future capacity is bounded and predictable;
- package clients can schedule remaining sessions meaningfully ahead;
- admin can adjust horizon without changing domain structure;
- old slots can be archived/retained as history separately from future capacity.

Costs and constraints:

- a scheduled generation/rolling job or on-demand boundary is required;
- rule/exception changes need idempotent regeneration;
- package expiry may fall beyond the horizon and require later extension;
- UI must distinguish no availability in horizon from no availability ever.

## Open follow-up

Define generation trigger/backfill cadence, exact horizon configuration owner, slot archival, and how package expiry beyond the current horizon is presented. Rule-change regeneration and preservation boundaries are resolved by ADR 0061.
