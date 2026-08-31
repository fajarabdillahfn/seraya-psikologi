# 76. Case-by-Case Cancellation Without Automatic Cutoff

## Status

Accepted for launch planning.

## Context

Seraya needs to receive cancellation requests through manual support/Admin CMS, including requests that may arrive close to or after the scheduled time. A rigid automatic cutoff would turn an unapproved commercial policy into a hidden state transition and would not fit the agreed manual-support model.

## Decision

For launch, there is **no automatic cancellation cutoff** that automatically approves, denies, releases capacity, or determines a refund.

- A client may communicate a cancellation request through the supported manual channel; Admin records a minimal `CancellationRequest` in CMS.
- While pending, the Appointment remains confirmed and the slot remains reserved.
- Admin makes an append-only `CancellationDecision` case-by-case.
- Approval atomically applies the existing cancellation effects: cancel Appointment, release only an eligible reusable future slot, and restore a still-valid entitlement when applicable.
- Denial leaves Booking, Appointment, slot, entitlement, and Payment unchanged.
- Refund is never inferred from timing or cancellation approval. Any refund is a separate append-only `RefundAction` with its own amount/type, reason, status, actor, and gateway reconciliation.
- Past, in-progress, invalid, or non-reusable capacity is not reopened; the result is recorded.

This policy does not grant client self-service cancellation or reschedule. It also does not automatically apply an entitlement-level/package refund formula; package refunds remain purchase-level Admin decisions under ADR 0063.

## Consequences

Positive:

- supports the current WhatsApp/manual Admin workflow without inventing a mandatory SLA or cutoff;
- keeps cancellation, capacity, entitlement, and refund effects auditable and explicit;
- allows Admin to handle exceptional circumstances without mutating domain truth silently.

Costs and constraints:

- clients need clear public wording that requests are reviewed, not automatically refundable;
- Admin needs a reason and decision record for every request;
- refund policy and approval authority still need a minimum vocabulary;
- support volume and consistency should be observed after launch.

## Source-of-truth clarification (2026-08-31 round)

The business owner has confirmed the policy:

- The booking product does not expose cancellation or refund in the public website.
- All cancellation and refund requests go through Admin WhatsApp; Admin records a minimal `CancellationRequest` in the workspace.
- Launch refund outcomes are still `full_refund` or `no_refund` (ADR 0077); any tiered partial-refund copy in the PRD Non-Teknis `booking_policy` is admin-conversation context, not an automated calculation.
- Public-facing copy states: "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."
- Third-party admin/transfer fees are internal Seraya costs, never debited to the client.

## Open follow-up

Define Admin reason categories used in the conversation log, gateway refund timing/retry/reconciliation, package credit/extension policy, and notification copy. Partial-refund product decision still requires a new ADR.
