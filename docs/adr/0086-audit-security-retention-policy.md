# 86. Retain Audit and Security Metadata by Policy

## Status

Accepted for launch planning; exact duration remains a policy-owner follow-up.

## Context

Audit/security metadata supports accountability for staff actions, Payment/Refund reconciliation, privacy decisions, access events, and incident investigation. It should not disappear when Client/contact data reaches its 12-month window.

## Decision

Retain Audit/security metadata for the period required by the applicable audit/legal policy, with the final duration recorded in a versioned RetentionPolicy by the joint policy owners. Preserve actor/target/action/time/correlation and redacted security context needed for accountability; do not retain secrets, raw tokens, clinical content, or unnecessary message payloads.

Audit/security retention is separate from Client/contact, Payment/Refund, ConsentRecord, and Notification delivery metadata. A privacy deletion/redaction action must itself leave the minimum permitted audit reference.

## Consequences

Positive:

- accountability survives contact-data minimization;
- no fixed legal duration is invented;
- audit records remain redacted and category-specific.

Costs and constraints:

- policy owners must record the applicable basis/duration;
- audit redaction must be designed so it does not erase accountability;
- access to audit data remains privileged and audited.

## Open follow-up

Record applicable audit/legal basis, duration, redaction fields, access policy, and incident/dispute exceptions in RetentionPolicy.
