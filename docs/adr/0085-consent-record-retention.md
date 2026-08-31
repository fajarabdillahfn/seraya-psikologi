# 85. Retain Consent with Related Records and Policy Requirements

## Status

Accepted for launch planning; exact policy implementation/evidence remains a follow-up.

## Context

ConsentRecord explains why particular transactional/contact data and communications were collected. Deleting it earlier than the related retained record would remove context; retaining it forever would ignore category-specific minimization.

## Decision

Retain each `ConsentRecord` for as long as the related service/data record remains retained, plus any applicable policy/legal requirement. Store consent version, purpose, scope, timestamp, actor/subject, and evidence reference needed to explain the collection/processing decision, without storing clinical notes or unnecessary message content.

ConsentRecord retention is separate from Client/contact's 12-month window and Payment/Refund's audit/legal policy. If related records are redacted/anonymized, preserve only the minimum consent reference required to explain the permitted outcome.

## Consequences

Positive:

- consent context remains available alongside the data decision it supports;
- no arbitrary single global retention window is introduced;
- redaction can preserve a minimal integrity reference.

Costs and constraints:

- RetentionPolicy must understand related-category dependencies;
- PrivacyRequest handling must distinguish consent evidence from contact identity;
- policy owners must define the exact evidence fields and exception precedence.

## Open follow-up

Define consent purposes/versions, evidence fields, relationship triggers, PrivacyRequest behavior, and policy/legal exceptions with joint sign-off.
