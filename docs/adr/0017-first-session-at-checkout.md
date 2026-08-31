# 17. Schedule the First Package Session at Checkout

## Status

Accepted for the MVP working model; PackagePurchase and first-entitlement reservation are resolved by ADR 0034/0035. Package validity/anchor, sequential ordering, closed-unit skipping, scoped guest access, restoration expiry, late-payment handling, and manual package refund accounting are resolved by ADR 0019/0020/0036–0038/0046/0059/0062/0063. Package unavailability/transfer exception and exact refund/extension criteria remain open.

## Context

Packages are supported in MVP, but forcing a client to choose every future session at purchase increases friction and may block capacity unnecessarily. Conversely, confirming a package with no concrete first session weakens the booking experience and makes the payment-gated Appointment flow ambiguous.

## Decision

At package checkout:

1. Client selects and holds the first AvailabilitySlot.
2. Payment success confirms the package Booking and creates the first Appointment.
3. The remaining package units become explicit SessionEntitlement records that are not yet scheduled.
4. A later client/admin scheduling flow may reserve the next valid entitlement and create another Appointment, subject to availability and policy; consumption happens only from the Appointment outcome.

A SessionEntitlement may produce at most one active Appointment at a time. PackagePurchase owns the units (ADR 0034), and the first Appointment reserves one unit without consuming it until outcome (ADR 0035).

## Consequences

Positive:

- first purchase has a concrete confirmed appointment;
- client does not need to commit all future dates at checkout;
- remaining sessions are countable/auditable;
- later scheduling can reuse the normal slot hold/concurrency flow.

Costs and constraints:

- package has two levels of state: purchased entitlement and scheduled appointment;
- notifications must distinguish first appointment from remaining sessions;
- expiry and launch full/no-refund outcomes need to account for scheduled/consumed/unused units; partial refunds are deferred;
- scoped ClientAccess must let a guest schedule remaining sessions safely without self-service cancellation/reschedule.

## Open follow-up

Define package unavailability/transfer exception, exact Admin refund criteria/approval, extension rules, and late-payment resolution SLA/timing. Package refund accounting, restoration expiry, and late-payment slot reacquisition rule are resolved by ADR 0060/0062/0063/0059.
