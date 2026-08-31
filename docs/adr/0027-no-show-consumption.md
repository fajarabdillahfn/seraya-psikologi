# 27. No-show Consumes Package Entitlement by Default

## Status

Accepted for the MVP working model; no-show grace period is resolved by ADR 0028, initial marking/correction authority by ADR 0028/0054, and restored-entitlement expiry by ADR 0062. Client notification, offering-specific grace variation, and Admin extension/refund effects remain open.

## Context

A no-show reserves psychologist time without a completed session. Automatically restoring the entitlement would make the practice absorb the capacity cost without a policy decision; treating it as a clinical judgment would cross the data boundary.

## Decision

When an authorized psychologist or admin marks an Appointment as `no_show`, the related SessionEntitlement is consumed by default. An admin may override/reverse the consumption only through an audited operational action. No-show handling contains no clinical content.

## Consequences

Positive:

- package balance reflects reserved professional capacity;
- no-show behavior is predictable and explainable before purchase;
- exceptions remain possible without silent edits;
- outcome and consumption are linked but still separate concepts.

Costs and constraints:

- marking authority and grace period must be defined;
- client communication must explain the policy;
- corrections may restore entitlement and affect expiry/refund calculations;
- staff must not use no-show as a proxy for clinical judgment.

## Open follow-up

Define whether grace can vary by ServiceOffering, client notification, and package restoration/expiry effects after an outcome correction.
