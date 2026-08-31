# 58. Make Psychologist Availability Changes Effective for Future Generation

## Status

Accepted for the MVP working model; precedence and regeneration boundaries are resolved by ADR 0061. Scheduler cadence/backfill, client messaging, and active-hold invalid-source resolution remain open.

## Context

Psychologists need to maintain their own future availability without waiting for an admin publication step. AvailabilityRule and AvailabilityException are operational schedule inputs, while generated slots and confirmed transactions have their own lifecycle.

## Decision

A psychologist may create or edit their own allowed AvailabilityRule/AvailabilityException inputs. Valid changes become effective directly for future AvailabilitySlot generation. Admin retains override, lock, and audit authority.

This decision does not permit in-place mutation of a confirmed Appointment, captured Payment, OfferSnapshot, PackagePurchase, or historical audit record. ADR 0061 defines that unheld/unbooked future slots may be regenerated or withdrawn, while active SlotHolds and Appointment-linked slots are preserved pending their explicit lifecycle.

## Consequences

Positive:

- psychologist self-service is operationally useful;
- availability changes do not wait for an unnecessary publication queue;
- protected transactional history remains stable;
- Admin can correct or lock operational inputs with audit.

Costs and constraints:

- generation must distinguish future source changes from booked history;
- active holds need deterministic handling;
- UI must show effective/pending/overridden schedule context;
- authorization and audit are required for every source change.

## Open follow-up

Define scheduler trigger/backfill cadence, client messaging for withdrawn/invalid future slots, and Admin resolution when an active hold's source becomes invalid. Rule/exception precedence and regeneration boundaries are resolved by ADR 0061.
