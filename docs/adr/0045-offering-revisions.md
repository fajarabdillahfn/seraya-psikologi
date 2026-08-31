# 45. Version Published ServiceOffering Changes

## Status

Accepted for the MVP working model; immutable revisions and preservation of held/booked historical source are resolved by ADR 0045/0061. Exact revision activation time, rollback validation, and CMS-content relationship remain open.

## Context

A published ServiceOffering can change price, duration, mode, or TransitionBuffer. In-place mutation risks applying new values to future slots or admin screens without preserving which configuration created a historical Appointment. OfferSnapshot protects transactions, but availability and public audit also need a stable configuration revision.

## Decision

Treat each published configuration as an immutable ServiceOfferingRevision under the stable ServiceOffering identity. A revision contains effective approved booking values and relevant policy references. New revisions are used for future slot generation and new OfferSnapshots after activation. Existing held/Appointment-linked AvailabilitySlot records retain their revision/snapshot; unheld future slots may be retained, regenerated, or withdrawn under ADR 0061, but are not silently migrated into a different historical transaction.

Draft edits may be changed before publication. Publishing creates/activates a new revision; rollback means activating an existing compatible revision through an audited admin action, not mutating the old revision.

## Consequences

Positive:

- public identity can remain stable while configuration history is preserved;
- future availability has a clear source revision;
- transactions and historical appointments remain interpretable;
- rollback is explicit and auditable.

Costs and constraints:

- revision activation and future-slot generation need idempotency;
- changes to duration/buffer can create incompatible future slots;
- admin UI must show active/future revision impact;
- archival and offering lifecycle need clear revision semantics.

## Open follow-up

Define revision activation time, rollback validation, client/admin messaging for withdrawn future slots, and whether copy/content changes share this revision or use CMS ContentRevision. Future unheld/held/booked handling is resolved by ADR 0061.
