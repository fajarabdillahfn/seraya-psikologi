# 50. Record Refunds as Separate Payment Actions

## Status

Accepted for the MVP working model; refunds are append-only PaymentAction records. Package refunds are explicit Admin purchase-level decisions without automatic per-entitlement allocation under ADR 0063. Launch refund vocabulary is full_refund/no_refund under ADR 0077; partial monetary refunds, exact approval hierarchy, gateway capability, and reconciliation schedule remain open/deferred.

## Context

A Payment represents the original client charge, while cancellation review, package unused/consumed units, admin exceptions, and gateway retries can produce refund actions. At launch, the action is full_refund or no_refund; partial refunds are deferred. Overwriting Payment with a single refund status loses financial history and makes retries/amounts ambiguous.

## Decision

Keep Payment as the original transaction and record each refund outcome as an append-only RefundAction/PaymentAction linked to it and to the relevant CancellationRequest/policy decision. At launch, a RefundAction is either `full_refund` for the captured amount or `no_refund` as an audited non-disbursement outcome; partial monetary refunds are deferred. Each action stores amount/currency where applicable, reason/category, actor/approval, gateway reference, status, idempotency key, timestamps, and redacted failure/retry metadata. The sum of successful actions cannot exceed the captured amount.

Gateway refund callbacks/reconciliation update the action idempotently; the original Payment is not rewritten to erase its history. A summarized Payment financial status may be derived for UX/reporting.

## Consequences

Positive:

- full/no-refund/package outcomes are representable; partial monetary refunds are deliberately deferred;
- duplicate refund commands can be deduplicated;
- finance/audit history is append-only;
- cancellation policy and gateway results remain distinguishable.

Costs and constraints:

- refund authorization and reconciliation are required;
- package refund calculation needs entitlement/consumption policy;
- UI must distinguish requested, processing, succeeded, failed, and reversed states;
- sensitive gateway references must be redacted/access-controlled.

## Open follow-up

Define launch full/no-refund eligibility, one-Admin approval/execution authority under ADR 0078, gateway refund API/event behavior, reconciliation cadence, and failed/refund-retry semantics. Partial refunds require a future explicit policy decision.
