# 88. Separate PRD Handoff from Production Launch Gate

## Status

Accepted for launch planning.

## Decision

Seraya may proceed to PRD/design handoff with explicit placeholders and open operational verification items. This means the domain model, business scope, technical requirements, UAT scenarios, and design work may continue without pretending that production is ready.

Production launch remains gated on:

- UAT pass for the recorded critical scenarios;
- Midtrans merchant onboarding, sandbox evidence, activated QRIS/VA method codes, fees, limits, refund capability, webhook verification, and reconciliation evidence;
- two Admin StaffMembership bootstrap;
- verified psychologist credentials/publication consent;
- replacement of `anytime/anyplace` with production schedule/location before live slots are published;
- approved consent/RetentionPolicy values and operational redaction/recovery runbooks;
- notification/payment failure handling and release sign-off.

Open placeholders are labeled in the PRD and must not create live booking/payment behavior by implication.

## Consequences

Positive:

- design and implementation planning are not blocked by operational onboarding steps;
- production readiness remains honest and testable;
- owners can distinguish product decisions from implementation evidence.

Costs and constraints:

- the team must not interpret PRD completion as launch approval;
- release checklist evidence must be maintained separately;
- placeholder content cannot be published as real availability/credentials/payment capability.

## Open follow-up

Run final stale scan, verify live/local synchronization, execute regression tests, and maintain the production preflight checklist until release sign-off.
