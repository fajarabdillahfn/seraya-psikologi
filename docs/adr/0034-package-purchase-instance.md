# 34. Separate Package Catalog from Purchased Package Instance

## Status

Accepted for the MVP working model.

## Context

A ServicePackage catalog can change price, session count, validity, copy, or policy over time. A package already purchased by a client must retain the effective terms that were paid for and must own a stable remaining-session balance. Reusing one mutable entity for both creates historical and entitlement ambiguity.

## Decision

- `ServicePackage` is the editable/publishable catalog configuration.
- `PackagePurchase` is created by a Booking after the package purchase is accepted/paid and owns the historical snapshot and SessionEntitlement units.
- `PackagePayment` settles the PackagePurchase, not the mutable catalog directly.
- PackagePurchase snapshots at least catalog identity/version, psychologist/ServiceOffering binding, effective price, session count, validity/expiry, and policy references.
- SessionEntitlement belongs to PackagePurchase. An Appointment for a package session references the entitlement it schedules.

## Consequences

Positive:

- catalog edits do not rewrite purchased history;
- package balance and expiry have a stable owner;
- payment/refund reconciliation has a concrete purchase target;
- first and later Appointment relationships become explicit.

Costs and constraints:

- more entities and snapshot fields are required;
- catalog publication and purchase creation need version semantics;
- package migration/transfer needs explicit admin operations;
- launch refund outcomes are full/no-refund at PackagePurchase level; partial monetary refunds/credits need a future explicit policy;

## Open follow-up

Define exact snapshot fields, purchase creation timing around verified webhook, whether one Booking can contain one PackagePurchase only, package activation/expiry start, and amendment/transfer behavior.
