# 12. Use Asia/Jakarta as Operational Timezone

## Status

Accepted for the MVP working model.

## Context

Availability rules, appointment slots, cancellation cutoffs, reminders, and payment/booking expiry need one operational interpretation. Browser or client timezone must not silently change when a psychologist is available.

## Decision

Use `Asia/Jakarta` as Seraya's canonical operational timezone. Store unambiguous timestamps/instants for events and retain the timezone ID needed to render and audit rule-based times. Display may be localized for a client later, but the schedule source of truth remains Asia/Jakarta.

## Consequences

Positive:

- one consistent schedule and policy interpretation;
- cutoff and reminder tests have a stable basis;
- browser locale cannot create accidental slot shifts;
- future multi-timezone display can be added without changing the business source of truth.

Costs and constraints:

- timezone-aware libraries and DST/transition tests are still required even if Jakarta currently has no DST;
- APIs must define whether input is local operational time or an absolute instant;
- notifications need explicit formatting rules.

## Open follow-up

Define timestamp representation, slot boundary semantics, and whether any future remote psychologist/location can opt into another operational timezone.
