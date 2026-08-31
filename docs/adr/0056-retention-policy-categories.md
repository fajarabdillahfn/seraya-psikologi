# 56. Model Retention by Transactional Data Category

## Status

Accepted for the MVP working model; exact durations, legal basis, anonymization strategy, and policy owner remain open.

## Context

Transactional data categories have different purposes and constraints. Payment/refund reconciliation, Booking/Appointment operations, Client contact, ConsentRecord, Notification delivery, and Audit metadata should not be forced into one retention number or deletion behavior.

## Decision

Represent retention as versioned RetentionPolicy per data category. A policy defines category, purpose, retention duration/trigger, deletion/anonymization action, legal/operational exception, owner, and effective version. PrivacyRequest records which policy/exception was applied. Payment/audit integrity must not be destroyed by a generic client deletion action; where deletion is approved, the system applies the category-specific redaction/anonymization behavior and retains only what the active policy permits.

No clinical category is introduced by this decision; clinical records remain out of MVP scope.

## Consequences

Positive:

- retention behavior is explicit and reviewable;
- privacy requests can explain why data is retained/redacted;
- financial/audit needs are separated from contact/notification data;
- policy changes can be versioned without rewriting history.

Costs and constraints:

- a policy owner and enforcement job/process are needed;
- references between redacted records must remain safe;
- legal review is required for actual durations/grounds;
- test fixtures must cover expiry/anonymization without exposing secrets or clinical data.

## Open follow-up

Define data categories, actual durations/triggers, legal owner, anonymization fields, execution cadence, and reporting after redaction.
