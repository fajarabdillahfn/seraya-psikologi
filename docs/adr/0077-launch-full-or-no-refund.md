# 77. Restrict Launch Refunds to Full or No Refund

## Status

Accepted for launch planning.

## Context

Cancellation is reviewed case-by-case and RefundAction is separate from CancellationDecision. The initial commercial policy should avoid arbitrary Admin-entered amounts and complex package allocation while preserving an audited financial record.

## Decision

For launch:

- `CancellationDecision` vocabulary is **approve** or **deny**;
- `RefundAction` outcome vocabulary is **full_refund** or **no_refund**;
- **partial monetary refunds are out of scope** for launch;
- a `full_refund` uses the captured amount of the relevant Payment/PackagePurchase, subject to gateway capability and idempotent reconciliation;
- a `no_refund` is an audited non-disbursement outcome with a reason and does not call the gateway refund API;
- every outcome records reason/category, actor, policy/version, timestamps, correlation/idempotency data, and any gateway reference/status where applicable;
- package refunds remain at `PackagePurchase` level and do not derive an amount from entitlement count or current catalog price.

If a gateway cannot execute a required full refund for an enabled payment method, Admin records a failed/pending reconciliation outcome and resolves it explicitly; the system must not silently substitute a partial amount or mark the refund successful.

## Consequences

Positive:

- Admin UI and policy are simple enough for launch;
- no arbitrary financial amount entry or per-entitlement split is required;
- full/no-refund outcomes remain auditable and separate from cancellation effects;
- partial-refund complexity can be introduced later as an explicit policy change.

Costs and constraints:

- Admin cannot use a partial refund to handle intermediate cases in MVP;
- edge cases need a reasoned full/no-refund decision or an external/manual resolution record;
- method-specific gateway support for full refund must be verified before production.

## Source-of-truth clarification (2026-08-31 round)

The published business (`seraya-psikologi-nonteknis-2026-08-31.json` `booking_policy §C`) lists tiered partial refunds and admin/admin-side bank-transfer fees. The business owner has resolved the conflict in favor of this ADR for the booking product:

- booking/refund handling is not exposed in the public website;
- requests come in through Admin WhatsApp and are recorded as CancellationRequest in the Admin workspace;
- launch refund vocabulary stays **full_refund** or **no_refund**;
- any tiered or admin-defined amount belongs to the Admin conversation and the CancellationDecision reason log, not to public copy or automated calculation;
- third-party admin/transfer fees are internal Seraya costs, not debited to the client;
- the public website shows only a short statement: "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."

The PRD Non-Teknis `booking_policy` text remains as a draft legal/public-copy reference. It is not a launch implementation source. Any future partial-refund product decision requires a new ADR.
