# 61. Regenerate Only Uncommitted Future Availability Slots

## Status

Accepted for the MVP working model; exact scheduler trigger/backfill cadence and invalid-slot client messaging remain open.

## Context

AvailabilityRule/Exception and ServiceOfferingRevision are sources for future capacity, but generated AvailabilitySlot, SlotHold, and Appointment have different commitments. Rebuilding every future row would risk deleting an active hold or changing a client-facing commitment.

## Decision

AvailabilityException overrides AvailabilityRule for the same operational date/range. A valid psychologist/Admin source change or activated ServiceOfferingRevision applies to future generation. Regeneration may create/update/withdraw only future AvailabilitySlot records that are not held and not linked to an Appointment.

- An unheld/unbooked slot that no longer matches effective rules/revision becomes `withdrawn`/unavailable rather than being hard-deleted.
- An unheld slot that remains valid may be retained or idempotently regenerated against the active source revision.
- An active SlotHold is preserved until its normal expiry or explicit Admin resolution; it is not silently deleted. If payment succeeds, normal/late-payment reconciliation decides whether the original slot can be claimed.
- A slot linked to a confirmed/replacement Appointment is preserved with its historical revision/snapshot and is never rewritten by source regeneration.
- Offering archival/revision changes stop new exposure/generation but do not mutate historical transactions.

All generation and withdrawal operations are idempotent and audited. Confirmed Appointment, Payment, OfferSnapshot, PackagePurchase, and historical source records are not edited in place.

## Consequences

Positive:

- source changes take effect for genuinely future capacity;
- holds and booked commitments are protected;
- withdrawn capacity remains explainable/auditable;
- revision changes do not corrupt historical pricing/scheduling semantics.

Costs and constraints:

- AvailabilitySlot needs an explicit withdrawn/unavailable state;
- scheduler must distinguish unheld, held, and Appointment-linked rows;
- an active hold may outlive its source availability and needs clear UX;
- generation/backfill and client notification remain operational policy.

## Open follow-up

Define scheduler trigger/backfill cadence, client messaging for withdrawn/invalid slots, and Admin resolution when an active hold's source becomes invalid.
