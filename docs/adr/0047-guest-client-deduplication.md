# 47. Keep Guest Client Records Separate by Default

## Status

Accepted for the MVP working model; exact merge/link semantics, verification checklist, and historical access behavior remain open.

## Context

The same email/phone can be shared by family members or reused for different people. Automatic dedupe could connect one guest to another person's Booking/package. A guest should not gain broad history merely because a contact value matches.

## Decision

Create/keep guest Client records separate by default. An authorized admin may perform a ClientMergeAction/identity link after manual verification. The operation records source/target records, evidence category, actor/time, resulting canonical identity, and affected references. Existing ClientAccess remains scoped and is not automatically broadened by a merge/link; a new verified access flow is required for each Booking/package.

No clinical records are merged because clinical records are out of MVP scope.

## Consequences

Positive:

- shared contact values do not cause automatic data exposure;
- support can resolve genuine duplicates deliberately;
- identity history remains auditable;
- guest access remains least-privilege.

Costs and constraints:

- duplicate Client rows may exist;
- admin workflow and verification checklist are needed;
- reporting must define whether linked records roll up;
- privacy requests must cover linked/merged references.

## Open follow-up

Define link vs irreversible merge semantics, admin permissions, post-merge access, correction/undo behavior, and reporting identity rules.
