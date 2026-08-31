# 7. Give Psychologists Scoped Self-Service

## Status

Accepted for the MVP working model; exact field-level visibility and approval workflow remain open.

## Context

The technical PRD has separate roles for psychologist, admin, and editor. A five-psychologist team should not require an admin to perform every small availability change, but self-service must not become cross-provider access or expose payment/PII unnecessarily.

## Decision

Use scoped role ownership:

- **Admin** can manage all operational entities, staff access, services/offerings, availability, bookings, payments/refunds, and policy configuration.
- **Editor** manages approved public content/CMS only and cannot access payment or client transactional data by default.
- **Psychologist** can manage their own PsychologistProfile, own AvailabilityRule/Exception/Slot inputs, and own Appointment views/actions allowed by policy. They cannot access another psychologist's operational data or payment details by default.
- **Client** can access only their own Booking/Appointment through an authenticated account or verified ClientAccess.
- **Visitor** can read published public content and start the booking flow, but has no private data access.

No role receives clinical-record access because clinical records are outside MVP scope.

## Consequences

Positive:

- less admin bottleneck for schedule changes;
- ownership maps cleanly to PsychologistProfile;
- least-privilege access is easier to test;
- editor and psychologist responsibilities remain separate.

Costs and constraints:

- authorization must be row-scoped, not only role-scoped;
- psychologist edits may need approval/publish states for public profile content;
- appointment actions (cancel, reschedule, view contact) need field-level policy;
- audit trail must identify actor and target owner.

## Open follow-up

Define exact permissions for publishing profile edits, seeing client contact data, cancelling/rescheduling, and viewing payment status without payment details.
