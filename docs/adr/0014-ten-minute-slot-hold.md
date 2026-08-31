# 14. Use a Ten-minute Configurable Slot Hold

## Status

Accepted for the MVP working model.

## Context

A SlotHold must give a client enough time to complete payment without making capacity unavailable indefinitely. The payment flow may include a redirect and asynchronous webhook, but a hold that is too long increases contention and perceived scarcity.

## Decision

Use a default SlotHold TTL of 10 minutes, configurable by an authorized admin/policy owner. The UI must show the remaining hold time and explain what happens when it expires. Expiry releases the slot and prevents a normal client-side continuation from confirming the Appointment.

Late payment/webhook behavior is resolved by ADR 0059: record paid-late, atomically reacquire the original slot if still free, otherwise route to Admin resolution without auto-assigning another slot. Expiry must not be treated as payment failure, and payment success must not blindly create an overlapping Appointment.

## Consequences

Positive:

- simple predictable client expectation;
- capacity is released promptly;
- operational tuning remains possible without a schema change;
- expiry is a testable state transition.

Costs and constraints:

- background expiry/reconciliation must be reliable;
- client UI needs a restart path;
- gateway/webhook races around the 10-minute boundary need idempotency and tests;
- changing TTL affects conversion and should be audited/configured deliberately.

## Open follow-up

Define whether TTL starts at slot selection or payment initiation, and who may change the configured value. Late-success outcome is resolved by ADR 0059.
