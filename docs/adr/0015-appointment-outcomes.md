# 15. Track Operational Appointment Outcomes

## Status

Accepted for the MVP working model; initial marking/correction authority is resolved by ADR 0028/0054, and no-show timing/consumption by ADR 0027/0028. Client-facing outcome history remains open.

## Context

A booking system needs to distinguish a confirmed appointment that happened from one that was cancelled or not attended. Keeping every past appointment in `confirmed` makes reporting, notification cleanup, and cancellation/refund policy ambiguous. The system must not use this as a place for clinical content.

## Decision

Appointment lifecycle includes these operational outcomes:

- `confirmed` — payment-gated scheduled commitment;
- `cancelled` — ended before the session under policy or admin action;
- `completed` — marked as operationally completed;
- `no_show` — marked as not attended according to policy.

Only authorized psychologist/admin actors may mark post-session outcomes. The outcome stores actor/time and allowed operational metadata, never clinical notes, diagnosis, assessment results, or treatment details.

## Consequences

Positive:

- reports and policy evaluation have meaningful terminal states;
- notifications can stop or change after an outcome;
- no-show handling can be explicit without a clinical system;
- operational and clinical boundaries stay separate.

Costs and constraints:

- permissions and correction rules are required;
- no-show consumption and timing are defined by ADR 0027/0028; remaining policy questions concern correction/exception behavior;
- outcome changes must be audited;
- UI copy must avoid implying clinical judgment.

## Open follow-up

Define the correction window/allowed transition matrix and whether client-facing history shows the outcome.
