# 16. Support Multi-session Packages in MVP

## Status

Accepted for the MVP working model; package boundaries are resolved by ADR 0017/0018/0022/0034–0038: progressive later scheduling, one psychologist/offering binding, full-upfront purchase, PackagePurchase, ordered SessionEntitlement, validity, and outcome-based consumption. Exact refund/extension/transfer exceptions remain open.

## Context

The product must support both a single-session purchase and a multi-session package in MVP. A package is not just a Booking with an arbitrary list of appointments: it carries session count/entitlement, usage, expiry, and refund implications.

The base distinction remains important: each Appointment is one concrete scheduled session, while Booking represents the client-facing purchase/commitment.

## Decision

Allow a Booking to represent either:

- one single-session ServiceOffering and one Appointment; or
- one multi-session package concept with multiple Appointment instances over its entitlement.

Introduce explicit `ServicePackage`, `PackagePurchase`, and `SessionEntitlement` concepts rather than hiding package metadata in Appointment rows. The package catalog defines session count, price, calendar validity, binding, and policy references; the purchase snapshots those terms and owns ordered entitlement units. First session is scheduled at checkout; later sessions are scheduled progressively. Outcome-based consumption, sequential scheduling with closed/expired skipping, and full-upfront settlement are defined by the linked ADRs. Exact partial-use cancellation/refund, extension/restoration, and transfer exceptions remain open.

## Consequences

Positive:

- the MVP scope reflects the user's package requirement;
- Appointment remains a clean per-session schedule object;
- remaining sessions and package expiry have a place to live;
- single-session and package flows can share Booking/Payment foundations.

Costs and constraints:

- payment success may confirm a package entitlement before all sessions have Appointment times;
- cancellation/refund must account for used and unused sessions;
- notification and access flows need session-level versus package-level messages;
- reporting must distinguish purchased, scheduled, completed, unused, and expired sessions.

## Open follow-up

Define exact refund/credit, extension/restoration, and transfer exception behavior.
