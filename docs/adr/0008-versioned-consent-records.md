# 8. Store Versioned Consent Records per Purpose

## Status

Accepted for the MVP working model; exact purposes, legal wording, retention, and withdrawal semantics require policy/legal review.

## Context

The website handles personal/contact data, booking/payment, and potentially sensitive mental-health context even though clinical records are out of scope. A single mutable `consent=true` field cannot prove which notice was accepted, for what purpose, or under which version.

Marketing consent also has a different purpose from the consent needed to process a booking and should not be bundled into one checkbox.

## Decision

Model ConsentRecord as a separate, append-oriented record containing at least:

- purpose;
- policy or notice version/reference;
- accepted/withdrawn action as applicable;
- timestamp;
- actor or ClientAccess context;
- source/channel;
- relation to the relevant client/booking flow.

Required transactional/privacy consent and optional marketing consent are separate purposes. A Booking may require the relevant ConsentRecords before proceeding, but consent history is not flattened into one mutable Booking boolean.

## Consequences

Positive:

- consent evidence is auditable and version-aware;
- policy updates do not rewrite historical acceptance;
- marketing opt-in can be managed independently;
- privacy review has an explicit data object and lifecycle.

Costs and constraints:

- purpose taxonomy and withdrawal behavior need policy decisions;
- records may be append-only or require a carefully defined correction path;
- UX must make purposes understandable rather than hiding them in one checkbox;
- deletion/export rules must account for consent evidence.

## Open follow-up

Define the initial consent purposes, whether withdrawal affects future bookings only, which version/reference is stored, and who may view consent records.
