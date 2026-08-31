# 33. Give Psychologists Scoped Assigned-client Visibility

## Status

Accepted for the MVP working model; exact field matrix and contact necessity by service remain open.

## Context

Psychologists need enough operational information to conduct assigned appointments, but the MVP does not contain clinical records and should not expose unrelated client/payment/privacy data. A broad Client history view would exceed the scheduling boundary.

## Decision

A Psychologist may view only appointments/package entitlements assigned to that Psychologist and the minimum operational client fields needed for the appointment: display name, service/offering, scheduled time, mode, and contact details only when operationally necessary. They cannot browse other psychologists' bookings, full Client history, payment details, full ConsentRecord history, or PrivacyRequest operations.

Admin retains cross-provider operational access subject to audit. Editor has no client visibility.

## Consequences

Positive:

- least-privilege access maps to assignment;
- team members can perform the session operation without a clinical system;
- payment/privacy boundaries remain separate;
- cross-provider browsing is prevented by design.

Costs and constraints:

- assignment changes need audit and effective-time rules;
- APIs must enforce scope server-side, not only hide UI fields;
- contact necessity may differ by service/mode;
- admin support needs an audited break-glass path if ever required.

## Open follow-up

Define exact field matrix, assignment lifecycle, whether contact is always visible or conditionally revealed, and admin break-glass approval/logging.
