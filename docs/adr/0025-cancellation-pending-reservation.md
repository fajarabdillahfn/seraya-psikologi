# 25. Keep Slot Reserved During Cancellation Review

## Status

Accepted for the MVP working model.

## Context

Cancellation requests arrive through manual/WhatsApp support and require admin review. Releasing a slot before the decision could allow another client to claim it, then leave the original request rejected or create an overlap if the cancellation is not approved.

## Decision

While a CancellationRequest is pending:

- the Appointment remains `confirmed`;
- the related capacity remains reserved and unavailable to new Booking flows;
- no refund or cancellation transition occurs yet.

An admin approve action must atomically apply the cancellation decision, Appointment/slot outcome, Payment/refund instruction, and notifications. A reject action leaves the confirmed Appointment/reservation intact and records the reason.

## Consequences

Positive:

- no ambiguous “maybe cancelled” capacity;
- rejection is safe and does not require restoring a slot;
- approval has one auditable transition boundary;
- payment and notification effects remain tied to the decision.

Costs and constraints:

- a slow review temporarily reduces available capacity;
- admin SLA/escation matters;
- approval requires concurrency control and idempotency;
- client support copy must explain pending status.

## Open follow-up

Define review SLA/escalation and exact approve/reject/refund state transitions. There is no pre-decision or separate post-decision slot release action in MVP; approved cancellation and eligible release are one atomic operation under ADR 0067.
