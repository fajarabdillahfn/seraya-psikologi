# 22. Settle Packages with Full Upfront Payment

## Status

Accepted for the MVP working model; gateway limits, refund/credit rules, and admin exceptions remain open.

## Context

A package creates multiple future session entitlements. Pay-per-session or installments would require payment schedules, partial access, failed installment states, and more complex refund/expiry accounting before the basic package flow is proven.

## Decision

A ServicePackage is paid in full upfront through one PackagePayment. Verified payment success confirms the package Booking, creates the full SessionEntitlement set, and confirms the first Appointment selected at checkout. Later scheduling or consumption of remaining entitlements does not create a new payment in MVP.

## Consequences

Positive:

- entitlement count is known immediately;
- package access and expiry are easier to reason about;
- one payment lifecycle can be reconciled against the package;
- later session scheduling stays separate from financial retries.

Costs and constraints:

- refunds/credits must account for used and unused units;
- full upfront payment increases commitment and must be explained clearly;
- gateway amount limits and payment expiry still need checks;
- an admin exception for payment correction must be audited.

## Open follow-up

Define package price display, gateway amount/settlement behavior, launch full/no-refund/credit policy, late payment handling, and whether an Admin can grant extra entitlement without payment. Partial monetary refunds are deferred beyond launch.
