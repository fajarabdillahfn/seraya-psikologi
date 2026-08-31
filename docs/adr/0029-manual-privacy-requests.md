# 29. Handle Privacy Requests Through a Manual Workflow

## Status

Accepted for the MVP working model; retention schedule, verification standard, and policy/legal wording remain open.

## Context

The MVP stores limited transactional personal data and operational/audit records but does not store clinical records. A client still needs a traceable way to request access, correction, deletion, or restriction. A self-service delete button could erase payment/audit evidence, break package/appointment history, or be abused without identity verification.

## Decision

Support PrivacyRequest through manual support/admin workflow. The request must be identity-verified, scoped to the relevant client/contact/booking data, and recorded with request type, decision, applicable retention/legal exception, and the result (access export, correction, redaction, anonymization, or justified retention). Payment reconciliation and required audit evidence are not blindly deleted; the policy determines what can be redacted or minimized.

The workflow must not collect or retain clinical notes as part of the request.

## Consequences

Positive:

- privacy operations are auditable from the first release;
- destructive actions are deliberate and identity-verified;
- payment/audit integrity is preserved while minimization remains possible;
- no full clinical-record feature is implied.

Costs and constraints:

- admin workload and response SLA are required;
- retention categories and legal review cannot be skipped;
- export/redaction tools need careful access control;
- support must avoid revealing data before verification.

## Open follow-up

Define request categories, verification steps, retention periods by data class, export format, redaction/anonymization semantics, and escalation/approval authority.
