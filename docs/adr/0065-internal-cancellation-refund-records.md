# 65. Keep Cancellation and Refund Records Internal and Minimal

## Status

Accepted for the MVP working model; internal minimal records are resolved by ADR 0065 and the Admin CMS execution surface by ADR 0067. Exact Admin form fields, decision vocabulary, approval hierarchy, and gateway reconciliation remain open.

## Context

Client-facing cancellation/refund interaction is intentionally manual through WhatsApp. Removing all structured records would make the operational result, payment action, entitlement effect, and audit trail depend on chat history alone.

## Decision

Keep three minimal internal records and expose their execution through the Admin Cancellation & Refund Workspace:

- `CancellationRequest`: intake/reference to the manual WhatsApp request, affected transaction, requester/contact verification, timestamp, and current review status;
- `CancellationDecision`: append-only Admin decision with outcome, reason/policy context, affected Appointment/slot/entitlement effect, and actor/time;
- `RefundAction`: append-only financial action linked to Payment and the decision or explicit Admin policy exception, including amount, reason, approval, gateway/reconciliation result.

These records are Admin/internal operational data. MVP exposes no client self-service cancellation/refund UI, no direct ClientAccess mutation, and no requirement to store WhatsApp chat transcripts. Manual chat is the interaction channel; structured records are the domain/audit result.

## Consequences

Positive:

- business keeps the simple manual WhatsApp workflow;
- operational and financial consequences remain queryable/auditable;
- chat provider/history is not the only source for internal state;
- no complex cancellation UX is required in public MVP.

Costs and constraints:

- Admin must enter a minimal result after manual handling;
- identity verification and privacy-safe note limits are required;
- records must not contain clinical narratives;
- exact policy and reconciliation still need operational definition.

## Open follow-up

Define minimal Admin form fields, decision vocabulary, approval hierarchy, client communication, and reconciliation SLA.
