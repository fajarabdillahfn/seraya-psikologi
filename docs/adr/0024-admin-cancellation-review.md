# 24. Require Admin Review for Single-session Cancellation

## Status

Accepted for the MVP working model; client/manual initiator, pending slot reservation, CancellationDecision separation, and Admin CMS execution surface are resolved by ADR 0024/0025/0051/0067. Review SLA/escalation, decision criteria, exact refund/credit outcomes, approval hierarchy, and package cancellation accounting remain open.

## Context

The practice wants every single-session cancellation to be reviewed by an admin rather than automatically applying a cutoff/refund rule. A mutable `cancelled` boolean would lose who requested it, who decided, which policy version applied, and what happened to payment/slot state.

## Decision

All single-session cancellation flows enter a CancellationRequest review lifecycle. In MVP, the client raises the request through WhatsApp/manual support; Admin records the minimum intake and executes the review in the Admin Cancellation & Refund Workspace (ADR 0067). ClientAccess does not directly create or execute cancellation. No automatic refund is issued solely from a client action or cutoff calculation. An authorized admin reviews the request, records an approve/deny decision and operational reason, applies the relevant versioned CancellationPolicy, and records the resulting Booking/Appointment/Payment/slot effects.

The request and decision must not become a place for clinical notes. Package cancellation/refund remains a separate branch accounting for used and unused entitlements.

## Consequences

Positive:

- business judgment is explicit and auditable;
- payment/refund and slot release do not happen accidentally;
- exceptional cases have a first-class operational record;
- public copy can accurately say cancellation is subject to review.

Costs and constraints:

- admin workload and response time become part of user experience;
- pending cancellation needs notifications and status visibility;
- Booking/Appointment may remain active while review is pending, so slot handling needs a policy;
- refund reconciliation happens after review decision.

## Open follow-up

Define review SLA/escalation, decision criteria/outcomes and refund amounts, and package cancellation/entitlement accounting.
