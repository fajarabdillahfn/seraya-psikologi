# 35. Reserve the First Package Entitlement at Checkout

## Status

Accepted for the MVP working model.

## Context

A package payment creates multiple SessionEntitlement units and the first Appointment is scheduled at checkout. If the first unit were consumed immediately, a later cancellation or incomplete session would make the balance inaccurate; if it were not linked to an entitlement, the package count would be ambiguous.

## Decision

After verified PackagePayment success, the first Appointment references and reserves exactly one available SessionEntitlement from the PackagePurchase. The entitlement moves to `scheduled`, not `consumed`. It becomes consumed when the Appointment is `completed` or when the authorized no-show rule applies. An approved cancellation releases the entitlement back to usable state if PackageValidity has not expired.

The reservation and Appointment link must be idempotent and concurrency-safe; one entitlement cannot be assigned to two simultaneous Appointments.

## Consequences

Positive:

- package balance remains accurate across completion/cancellation;
- first and later sessions use one consistent entitlement model;
- refund/credit calculations can distinguish scheduled vs consumed;
- duplicate webhook retries cannot create duplicate units/appointments.

Costs and constraints:

- Appointment and entitlement transitions must be coordinated;
- expiry/restoration edge cases need policy;
- a package with zero available units cannot schedule another Appointment;
- correction of outcome requires audited reversal.

## Open follow-up

Define exact state names, whether a pending SlotHold reserves an entitlement before payment, and late payment/expiry behavior.
