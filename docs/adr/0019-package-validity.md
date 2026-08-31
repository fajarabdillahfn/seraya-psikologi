# 19. Give Packages a Visible Configurable Validity Period

## Status

Accepted for the MVP working model; validity is configurable per ServicePackage (ADR 0048), calendar-period arithmetic is resolved by ADR 0055, and payment-success anchoring/Asia-Jakarta semantics are resolved by ADR 0036. Restoration retains original expiry under ADR 0062 and package refund accounting is manual purchase-level under ADR 0063. Exact duration values, allowed units/range, end-of-month boundary, extension, and refund eligibility/amount remain open.

## Context

Multi-session packages create a future obligation to schedule unused sessions. An indefinite entitlement complicates capacity planning, reporting, notifications, policy changes, and refunds. A hidden expiry would be unfair and difficult to explain.

## Decision

Every ServicePackage has a visible, configurable PackageValidity period. The applicable expiry is recorded with the Booking/SessionEntitlement. After expiry, unused entitlements enter an expired state and cannot be scheduled through the normal client flow. An authorized admin may grant an exception only with an audit reason.

The period and expiry boundary must use the operational timezone/policy version and be shown before payment.

## Consequences

Positive:

- clients know the commitment before purchase;
- unused-session liability has a defined boundary;
- reminders and reporting can target upcoming expiry;
- exceptions are auditable rather than silent indefinite extensions.

Costs and constraints:

- exact durations may need different package configurations later;
- expiry notifications and timezone semantics are required;
- refund/credit behavior for expired unused sessions needs business policy;
- admin exception access must be controlled.

## Open follow-up

Choose exact duration values/allowed units, end-of-month and local expiry boundary, extension/restoration, reminder offsets, and launch full/no-refund/credit behavior. Partial monetary refunds are deferred beyond launch.
