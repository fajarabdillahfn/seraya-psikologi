# 49. Keep Crisis Handling Outside the Booking Domain

## Status

Accepted for the MVP working model; exact notice copy, referral resources, localization, and content ownership require policy/professional review.

## Context

A booking/payment system is not a crisis response or clinical triage system. Collecting crisis disclosures or automated screening would create a different clinical/safety boundary than the transactional MVP and could mislead a person about response guarantees.

## Decision

Provide a static, versioned CrisisNotice/referral content path in public UX and relevant booking context. It clearly states that Seraya booking is not emergency/crisis response and points to appropriate local emergency/support resources. Do not collect crisis narratives, implement automated triage, score risk, or create crisis escalation records in the booking MVP.

If a person contacts support manually, staff use an out-of-band operational procedure; that interaction is not silently stored as a clinical record in this MVP.

## Consequences

Positive:

- domain boundary stays transactional rather than clinical;
- copy can set realistic expectations;
- no automated safety claims are implied;
- clinical record scope remains explicit.

Costs and constraints:

- notice/referral content needs professional/policy ownership;
- public and booking flows must not hide the notice;
- manual support needs a separate operating procedure;
- future clinical expansion would require a new scope decision, not an ad hoc field.

## Open follow-up

Define notice placement/versioning, local resources, after-hours wording, and content owner/reviewer.
