# 6. Minimize Client Data in Booking MVP

## Status

Accepted for the MVP working model; retention, field-level access, and consent wording still need domain/legal review.

## Context

The product is a booking-and-payment platform, not a clinical record system. Asking for detailed reasons, symptoms, or intake narratives before a first booking increases sensitivity and creates an accidental clinical-data boundary before the practice has designed a clinical system.

The website still needs enough information to identify the contact, complete payment, communicate the appointment, and record required consent.

## Decision

Booking MVP collects only:

- minimum client/contact identity needed for the transaction;
- verified contact point for access and notifications;
- selected ServiceOffering, psychologist, AvailabilitySlot, and effective booking details;
- Payment and gateway references needed for reconciliation;
- required consent/policy acknowledgements;
- optional short message only if explicitly labeled non-clinical and bounded.

The MVP must not require or store diagnosis, detailed symptom narratives, assessment results, clinical notes, treatment details, or session records. If a user enters clinical content into an optional message, the system should not treat it as a clinical record; handling, redaction, or support escalation remains an operational policy decision.

## Consequences

Positive:

- smaller privacy and breach surface;
- clearer boundary between transactional and clinical systems;
- lower first-booking friction;
- simpler retention/deletion design for MVP.

Costs and constraints:

- some services may need a separate future intake workflow;
- validation and copy must discourage clinical narratives in the optional field;
- staff tools must avoid displaying transactional notes as clinical information;
- privacy notice and consent wording need specialist review.

## Open follow-up

Define the exact allowed fields, maximum optional-message length, retention periods, access matrix, deletion/export behavior, and the escalation path when a client discloses crisis content through a non-clinical channel.
