# 54. Correct Appointment Outcomes Through Admin-only Events

## Status

Accepted for the MVP working model; correction authority is Admin-only and audited, while restored-entitlement expiry is resolved by ADR 0062. Exact correction window, allowed transition matrix, second approval, and client-facing outcome visibility remain open.

## Context

Appointment outcomes drive SessionEntitlement consumption, no-show handling, reporting, reminders, and possible refund/credit decisions. Mutating a completed/no-show value in place would erase why the balance changed.

## Decision

Psychologist or Admin may mark the initial `completed`/`no_show` outcome. After an outcome exists, only an authorized Admin may create an append-only OutcomeCorrection event with old/new outcome, reason/category, actor/time, affected entitlement/refund/reporting effects, and correction lineage. The original outcome remains immutable history. Correction must be idempotent and apply entitlement/refund adjustments atomically.

No outcome or correction stores clinical notes, diagnosis, assessment results, or treatment details.

## Consequences

Positive:

- psychologists can finish routine operational work;
- sensitive balance-changing corrections are controlled;
- history remains auditable;
- downstream reminders/reporting can recompute safely.

Costs and constraints:

- transition matrix and correction window are required;
- admin UI must show old/new outcome and consequences;
- correction may require RefundAction/entitlement reversal;
- duplicate correction commands must not double-adjust state.

## Open follow-up

Define allowed transitions/window, whether correction requires second admin approval, client-facing outcome visibility, and the exact RefundAction/entitlement effects for an expired restored unit. Restoration expiry policy is resolved by ADR 0062.
