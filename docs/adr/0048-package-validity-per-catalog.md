# 48. Configure Package Validity per ServicePackage

## Status

Accepted for the MVP working model; calendar-period validity is resolved by ADR 0055 and restoration retains original expiry under ADR 0062. Exact duration units/range, end-of-month policy, and Admin extension behavior remain open.

## Context

Different package products may have different expected cadence or commercial validity. A single global duration would force unrelated packages into the same policy and make catalog copy misleading.

## Decision

ServicePackage catalog stores a validity duration/configuration. On verified purchase, PackagePurchase snapshots that duration/configuration, start instant, Asia/Jakarta semantics, and computed expiry. Changing the catalog duration affects future purchases only. The technical model does not prescribe the business number yet; public copy must show the effective duration before payment.

## Consequences

Positive:

- package products can express distinct commercial rules;
- historical purchases remain stable;
- expiry is visible and explainable;
- global validation can still enforce allowed bounds.

Costs and constraints:

- duration units/calendar arithmetic need a canonical policy;
- admin must validate unreasonable values;
- package reminders and refund/credit use the snapshot;
- catalog edits need revision/audit behavior.

## Open follow-up

Choose allowed units/range, exact business values, end-of-month/local expiry policy, and extension/restoration behavior.
