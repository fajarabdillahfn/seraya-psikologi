# 44. Publish ServiceOfferings Through a Draft-published-archived Lifecycle

## Status

Accepted for the MVP working model; published-only generation and source-change handling for unheld/held/booked future slots are resolved by ADR 0044/0061. Exact approval UI and reactivation rules remain open.

## Context

A ServiceOffering is both public catalog content and an operational source for generated AvailabilitySlot records. An `active/inactive` flag alone does not distinguish an incomplete draft from a previously published offering, and archive must not mutate historical Booking/Appointment data.

## Decision

Use lifecycle:

- `draft`: editable; not exposed/bookable; does not generate new slots;
- `published`: public and eligible for new slot generation/booking;
- `archived`: no new exposure, generation, or booking; historical records remain readable.

Admin publishes/protects the offering. Psychologist may edit approved own fields within RBAC, but direct publication of professional/operational facts is not granted by the Editor CMS permission. Reactivation, held-slot handling, and changes to an offering with future bookings require explicit audited behavior.

## Consequences

Positive:

- incomplete offerings cannot accidentally sell;
- archive preserves public/operational history;
- slot generation has an unambiguous eligibility filter;
- CMS/editor direct-publish does not leak into protected booking configuration.

Costs and constraints:

- lifecycle transitions and permissions need server-side enforcement;
- archive/price changes must not mutate OfferSnapshot;
- future held slots need a defined policy;
- admin UI must show historical vs future impact.

## Open follow-up

Define reactivation, transition permissions, and client/admin messaging for withdrawn or invalid future slots. Future held/booked preservation is resolved by ADR 0061; revision activation/editing is governed by ADR 0045.
