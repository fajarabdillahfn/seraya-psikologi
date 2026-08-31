# 67. Execute Cancellation and Refund Through Admin CMS

## Status

Accepted; Admin CMS execution and automatic atomic release of eligible future capacity on approved cancellation are resolved. Exact Admin fields, decision vocabulary, approval hierarchy, and gateway reconciliation remain open.

## Context

Cancellation/refund is discussed manually through WhatsApp, but the operational result must not live only in chat. Admin needs one back-office/CMS surface to find the transaction, record the decision, release future capacity, restore package entitlement when applicable, and record a separate financial action.

## Decision

Add an Admin-only Cancellation & Refund Workspace to the CMS/backoffice. From a Booking/Appointment/PackagePurchase detail, Admin may:

1. create or open the minimum `CancellationRequest` intake after the WhatsApp discussion;
2. record an append-only `CancellationDecision` with outcome, reason/category, policy version, actor/time, and intended operational effects;
3. approve or deny the request through an idempotent atomic command. Approval and release are one operation; MVP has no separate `Release Slot` command. If the slot is future and reusable, the same command returns it to availability; otherwise it records why capacity was not re-exposed;
4. record or initiate a separate `RefundAction` when the decision/policy calls for it;
5. view the resulting Appointment, slot, entitlement, Payment, and audit history.

For an approved cancellation:

- the Appointment remains as historical record and moves to `cancelled`;
- if its future AvailabilitySlot is still a valid reusable capacity, the slot is released/returned to availability atomically; a past, expired, withdrawn, or otherwise invalid slot is not re-exposed;
- a package SessionEntitlement is restored to its original sequence and expiry if policy allows; expired entitlement remains closed unless a separate audited extension is granted;
- RefundAction is separate from the schedule effect. A refund can be pending, failed, reversed, or denied without rewriting the CancellationDecision or original Payment history.

While the request is pending, Appointment and slot remain confirmed/reserved. Denial leaves the booking, Appointment, slot, entitlement, and Payment state intact. Approval, Appointment cancellation, eligible slot release, and valid entitlement restoration are one atomic/idempotent operation; there is no separate release step in MVP. Corrections create a new audited decision rather than editing history.

WhatsApp remains the discussion/support channel, not the command authority. The workspace must not store clinical notes or require full chat transcript storage.

## Consequences

Positive:

- Admin gets an explicit operational tool without exposing client self-service cancellation;
- released future capacity can be sold again safely;
- schedule, entitlement, and financial effects are separately traceable;
- WhatsApp conversation and system-of-record responsibilities stay separated.

Costs and constraints:

- atomic/idempotent command and concurrency checks are required;
- Admin must enter a minimal reason/effect record;
- refund gateway/reconciliation remains separate operational work;
- past/invalid slots need a visible non-reusable outcome.

## Open follow-up

Define exact Admin form fields, decision vocabulary, approval hierarchy, refund initiation/retry behavior, client notification after the decision, and visible result handling for a slot that cannot be re-exposed. Do not add a separate pre/post-approval slot-release action unless a later policy explicitly supersedes this ADR.
