# 39. Reschedule with a Replacement Appointment

## Status

Accepted for the MVP working model; replacement Appointment, same-payment, same-entitlement, and Admin-only operation are resolved by ADR 0039. Whether reschedule is allowed after each lifecycle state, policy cutoff, approval details, and client notification/recovery remain open.

## Context

Editing an Appointment's time in place destroys the original commitment, complicates audit, and can accidentally consume or release a package entitlement twice. Requiring a new payment/Booking for a staff-approved schedule change misrepresents the existing purchase.

## Decision

An authorized admin performs a RescheduleAction:

1. preserve the original Appointment record;
2. mark it `rescheduled` with actor/time/reason and link to the replacement;
3. hold/claim a new AvailabilitySlot;
4. create a replacement Appointment for the same Booking;
5. for a package, link the replacement to the same SessionEntitlement and PackagePurchase;
6. carry forward the existing Payment/financial settlement; no new Payment or entitlement is created;
7. release the old slot only as part of the atomic successful action.

The replacement must pass the same overlap/concurrency constraints. If the new slot cannot be claimed, the original Appointment remains active.

## Consequences

Positive:

- original and replacement schedule history are explicit;
- package balance is not double-consumed;
- financial reconciliation remains tied to the original purchase;
- failed reschedule does not destroy the working appointment.

Costs and constraints:

- Appointment state and replacement links are needed;
- action must be idempotent and transactional across old/new slot;
- notifications must distinguish changed schedule from cancellation;
- cancellation/refund policy may impose restrictions that admin must see.

## Open follow-up

Define allowed reschedule lifecycle states, policy cutoff/approval interaction, and client notification/recovery behavior. Admin-only authority and replacement/same-entitlement semantics are resolved.
