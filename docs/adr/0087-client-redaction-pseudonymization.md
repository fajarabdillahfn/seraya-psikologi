# 87. Redact Direct Client Identifiers and Preserve Minimal Pseudonymous Links

## Status

Accepted for launch planning.

## Context

Client/contact data reaches a 12-month retention window, but Booking/Appointment/Payment/Refund/audit integrity may still require a historical reference. Hard-deleting the entire Client graph would either destroy integrity or force unsafe exceptions.

## Decision

After Client/contact retention eligibility is reached:

- redact direct identifiers and optional WhatsApp-capable contact fields;
- replace the client reference with a non-identifying/pseudonymous reference where historical integrity requires one;
- retain only the minimum transactional, financial, consent, and audit links permitted by their category-specific RetentionPolicy;
- do not retain clinical notes, diagnosis, assessment results, crisis narratives, or raw support transcripts;
- record the redaction/anonymization outcome, policy version, actor/job, timestamp, and affected categories in the permitted audit reference.

The pseudonymous reference must not be a reversible copy of the original contact value and must not be exposed through ClientAccess or public UI. Active dependencies, disputes, applicable audit/legal policy, or PrivacyRequest exceptions may delay or alter the category-specific action; the exception is recorded rather than silently skipped.

## Consequences

Positive:

- minimizes direct contact exposure while preserving necessary transaction/audit integrity;
- avoids a destructive cascade across Booking/Payment/Audit;
- makes anonymization observable and policy-versioned.

Costs and constraints:

- retention jobs/PrivacyRequest handlers need category-aware field maps;
- pseudonymous links require access controls and non-reversibility checks;
- owners must approve the exact field-level redaction map.

## Open follow-up

Define field-level redaction map, pseudonym generation/storage, exception precedence, job/manual trigger, verification evidence, and client-facing PrivacyRequest behavior.
