# 78. One Admin May Execute Separate Cancellation and Refund Actions

## Status

Accepted for launch planning.

## Context

The MVP has a small operational team and already separates cancellation decisions from refund actions. A second-approver workflow would add operational friction without a current threshold policy, but combining both outcomes into one mutable status would weaken auditability.

## Decision

One authorized **Admin** may:

1. record and approve/deny the `CancellationDecision`; and
2. separately create/execute the `RefundAction` (`full_refund` or `no_refund`).

The two actions remain separate commands and append-only records even when the same Admin performs both. Each records actor, timestamp, reason/category, policy/version, target, correlation/idempotency data, and resulting status. The Admin UI must not imply that approving cancellation automatically executes a gateway refund.

No second approval, dual-control requirement, or amount threshold is required in MVP. Future financial controls may introduce one as an explicit policy change.

A failed/pending/reversed gateway refund does not rewrite or silently roll back the already-recorded CancellationDecision or its atomic Appointment/slot/entitlement effects. Admin handles retry or explicit resolution through the RefundAction record.

## Consequences

Positive:

- supports the small launch team and simple operational workflow;
- preserves clear separation between service/capacity decision and financial action;
- makes retries and gateway failures auditable;
- leaves room for future dual-control policy without changing domain history.

Costs and constraints:

- one Admin has significant authority, so audit and access protection matter;
- refunds must be reviewed carefully before execution;
- UI must expose two distinct actions and statuses;
- no automatic rollback from a refund failure is available.

## Open follow-up

Define exact Admin permission flag/invite, audit view, notification copy, refund retry/reconciliation runbook, and future threshold/dual-control policy if the team grows.
