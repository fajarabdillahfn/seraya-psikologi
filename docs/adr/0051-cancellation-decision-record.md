# 51. Separate Cancellation Intake from Admin Decision

## Status

Accepted for the MVP working model; request/decision separation, approve/deny CancellationDecision vocabulary, one-Admin execution with separate RefundAction authority (ADR 0078), atomic effects, minimal internal records, Admin CMS execution surface, and no separate slot-release step are resolved by ADR 0051/0065/0067/0076/0078. Refund outcome vocabulary full_refund/no_refund is resolved by ADR 0077. Repeat-request rules, Admin form fields, and low-level effect ordering details remain open.

## Context

A client request received through WhatsApp/manual support is not itself an approval. Updating one mutable status on Booking can lose the intake, decision, refund, entitlement, and operational effects—especially if an admin later corrects or reviews a request again.

## Decision

Keep CancellationRequest as the intake record and append a separate CancellationDecision for each authorized review outcome. The Admin Cancellation & Refund Workspace is the MVP execution surface: after manual WhatsApp intake, Admin records approve/deny outcome, actor/approval, reason/category, timestamp, policy/version, Appointment/SlotHold/entitlement effect, and linked RefundAction (`full_refund` or `no_refund`) or no-refund reason. The decision is the only operation allowed to transition the target state; the original request remains immutable history.

An approved decision performs the relevant state changes atomically: Appointment/slot cancellation or package entitlement release, then RefundAction creation if applicable. A denied decision leaves the original Appointment/slot/payment state intact. Corrections create a new audited decision rather than rewriting the old one.

## Consequences

Positive:

- request and authority decision remain distinct;
- refund/entitlement/slot effects are traceable;
- corrections and re-review do not erase history;
- operational UI can explain pending vs approved vs denied.

Costs and constraints:

- state transitions must be transactional/idempotent;
- repeat requests need a defined rule;
- approval separation may be needed for financial thresholds;
- manual support data must remain within the booking data boundary.

## Open follow-up

Define whether one open request is allowed per target, approval separation, repeat/correction rules, exact Admin form fields, and low-level effect ordering. CancellationDecision approve/deny and RefundAction full_refund/no_refund are resolved by ADR 0076/0077. Approved cancellation and eligible slot release are one atomic operation; no pre-decision or separate post-decision release action exists in MVP.
