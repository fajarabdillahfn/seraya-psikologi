# PRD 06 — Privacy & Consent

## Goal

Collect only the data needed to book and operate a session, while making the boundary visible to the client.

## MVP data boundary

Allowed transactional data includes client contact details, booking/intake fields, consent version, schedule, payment proof metadata, and operational audit records.

Not collected in this product: clinical notes, diagnosis, assessment results, transcripts, treatment notes, or crisis narratives.

## Consent

- Consent is versioned.
- Couple participants require separate participant consent when that flow is enabled.
- Final public wording requires clinical/ethics and privacy/legal sign-off.

## Acceptance checks

- Consent version is stored with the booking.
- Public notices are linked before submission.
- Logs do not print contact or clinical fields.
- Retention/deletion actions are not enabled in production until the operational procedure and restore evidence exist.
