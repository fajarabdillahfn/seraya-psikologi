# 31. Separate Editorial Profile Copy from Protected Facts

## Status

Accepted for the MVP working model; exact field matrix and approval/locking UI remain open.

## Context

The Editor role may publish ContentEntry directly, while Psychologist has scoped self-service and Admin owns operational data. A psychologist profile combines narrative copy with credentials, professional facts, ServiceOffering, and availability; treating all fields as generic CMS content would let an editor unintentionally change booking/trust-critical data.

## Decision

Split profile ownership by field class:

- **Editor** may manage narrative/public copy such as bio wording, article/FAQ content, and presentation text, and may publish those ContentEntry fields directly.
- **Psychologist** may propose/edit allowed fields in their own profile and availability according to RBAC; they cannot alter protected credentials or bypass operational rules.
- **Admin** controls credentials, approved professional facts, ServiceOffering, availability publication/locks, and protected profile field publication.

Changes to protected fields are not ordinary editor CMS publishes; they are operational actions with audit metadata.

## Consequences

Positive:

- direct editor publishing remains fast without weakening professional fact control;
- booking availability and service data have clear ownership;
- profile trust signals are protected from accidental copy edits;
- field-level authorization becomes explicit.

Costs and constraints:

- UI/API needs a field matrix rather than one broad profile permission;
- some profile changes may need two-step proposal/approval;
- audit records must distinguish editorial vs protected changes;
- content and profile entities need clear boundaries.

## Open follow-up

List profile fields by class, decide psychologist self-edit fields, define admin approval/lock behavior, and specify whether narrative edits can mention protected facts without structured validation.
