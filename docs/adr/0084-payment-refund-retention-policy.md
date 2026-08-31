# 84. Retain Payment and Refund Records by Audit/Legal Policy

## Status

Accepted for launch planning; exact duration remains a policy-owner follow-up.

## Context

Payment, PaymentEvent, and RefundAction records carry financial/audit integrity and cannot follow the 12-month Client/contact retention window. The team has not selected a fixed duration independent of applicable audit/legal requirements.

## Decision

Retain Payment/PaymentEvent/RefundAction records for the period required by the applicable audit/legal policy, with the final duration recorded in a versioned `RetentionPolicy` by the joint policy owners. Preserve the minimum redacted financial/reference data needed for reconciliation, audit, dispute handling, and domain integrity. Do not cascade-delete or anonymize away the original financial relationship merely because Client/contact data reaches its 12-month window.

This decision does not claim a specific legal duration. Until the policy value is entered, the implementation must treat Payment/Refund retention as a protected category and fail closed against destructive deletion.

## Consequences

Positive:

- avoids inventing a legal/accounting duration;
- separates financial integrity from Client/contact minimization;
- keeps retention policy versioned and auditable.

Costs and constraints:

- launch still needs the policy owner to record the applicable duration/trigger;
- deletion/privacy workflows need category-specific exceptions;
- provider references and reports must be redacted/minimized without losing reconciliation ability.

## Open follow-up

Record the applicable audit/legal basis, duration, trigger, policy owner, redaction fields, dispute/chargeback exceptions, and operational reconciliation evidence.
