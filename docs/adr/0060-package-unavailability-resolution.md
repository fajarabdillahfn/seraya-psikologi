# 60. Resolve Package Unavailability Explicitly

## Status

Accepted for the MVP working model; exact SLA, client communication, launch full/no-refund/credit calculation, and transfer eligibility remain open. Partial monetary refunds are deferred beyond launch by ADR 0077.

## Context

A PackagePurchase is bound to one psychologist and one ServiceOffering. That binding is part of what the client bought; silently moving a package to another psychologist/offering can change fit, consent, price, mode, and expectations. At the same time, illness, leave, departure, or offering archival can make future sessions unavailable.

## Decision

Keep the PackagePurchase bound to its original psychologist/ServiceOffering by default. Admin first attempts a replacement schedule within the same offering. If that is not feasible, Admin creates an audited PackageAvailabilityResolution and presents an explicit client-approved option such as:

- full refund or no refund at launch; partial monetary refunds require a future explicit policy;
- credit/extension under policy;
- transfer to another psychologist/offering only as an explicit exception with client approval and updated terms/consent.

The system must not auto-transfer, auto-assign a different psychologist, or silently rewrite the PackagePurchase binding. Existing completed/consumed history remains tied to the original purchase and entitlement sequence.

## Consequences

Positive:

- package promise and professional choice remain explicit;
- client consent is preserved for cross-psychologist transfer;
- operational unavailability has a first-class path;
- financial and entitlement effects are auditable.

Costs and constraints:

- Admin support work is required;
- resolution may involve RefundAction, validity extension, or replacement Appointment;
- transfer needs a new OfferSnapshot/terms/consent comparison;
- client communication and SLA become important.

## Open follow-up

Define resolution SLA, eligible events, client response timeout, launch full/no-refund/credit formula, extension semantics, and transfer data/consent workflow. Partial monetary refunds remain deferred.
