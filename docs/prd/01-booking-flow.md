# PRD 01 — Booking Flow

## Goal

A client can choose a published SERAYA PULANG offering, choose a future slot, submit minimum intake, and receive a manual-payment handoff.

## In scope

- Individual counseling, online or offline, 60 minutes.
- Guest booking; no full account required.
- Required: full name, email, consent acknowledgement.
- Optional: phone, short non-clinical message.
- Eligibility: self-service 18–40; ages 16–17 use guardian route.
- Cutoff: booking must be at least 1 hour before session start.
- Slot hold: 10 minutes.
- Capacity: 15-minute transition buffer on both sides.

## Happy path

1. Client opens SERAYA PULANG.
2. Client selects online/offline offering.
3. Client selects a future slot.
4. Client submits intake and consent.
5. System creates Booking + OfferSnapshot + SlotHold + CapacityReservation atomically.
6. Booking starts as `pending_manual_payment`.
7. Client sees invoice and WhatsApp handoff.

## Important states

`pending_manual_payment` → `awaiting_confirmation` → `confirmed`

Other terminal/exception states are defined in the implementation reference and ADRs. The website must not promise a confirmed appointment before Admin verifies payment.

## Acceptance checks

- Invalid/missing name, email, consent, crisis acknowledgement, or cutoff returns a useful error.
- A held slot cannot be claimed by an overlapping booking.
- Repeating the same write request does not create duplicate business records.
- Confirmation page contains booking ID, hold expiry, invoice links, and WhatsApp handoff.
- No clinical narrative is persisted.

## Open for next review

- Replace demo schedule with Fuja's real availability and venue/meeting instructions.
- Decide whether couple checkout remains deferred for launch.

## References

- `docs/adr/0089-architecture-worker-d1.md`
- `docs/adr/0090-couple-participant-model.md`
- `docs/adr/0091-capacity-overlap-buffer.md`
- `docs/adr/0094-intake-eligibility-cutoff.md`
