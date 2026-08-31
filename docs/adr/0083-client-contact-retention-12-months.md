# 83. Retain Client and Contact Data for 12 Months

## Status

Accepted for launch planning; duration selected, exact trigger implementation remains to be specified in the RetentionPolicy record.

## Context

Seraya stores minimal Client/contact data for booking, appointment communication, ClientAccess, and optional manual support. The retention model is category-specific and must not be confused with Payment, audit, or security retention.

## Decision

Retain Client/contact data for **12 months after the client's last active service**. The retention clock and policy version must be stored explicitly; the implementation must not delete a Client row while active Booking, Appointment, PackagePurchase, Payment/Refund, PrivacyRequest, or audit dependencies require a permitted reference. When deletion is not legally/operationally possible, apply the approved category-specific redaction/anonymization outcome and preserve only the minimum integrity reference.

This decision covers Client/contact identity and optional WhatsApp-capable contact data. It does not set the retention duration for Payment/Refund, ConsentRecord, Notification delivery, or Audit/security metadata.

## Consequences

Positive:

- limits long-lived contact data while supporting post-service operational needs;
- keeps retention category-specific;
- makes redaction/anonymization a controlled policy outcome rather than a destructive cascade.

Costs and constraints:

- the system must calculate and audit the last-active-service trigger;
- active financial/audit/consent dependencies may require redaction instead of physical deletion;
- the clinical/data owner must approve the exact implementation trigger and evidence.

## Open follow-up

Define the exact last-active-service event, exception precedence, PrivacyRequest workflow, anonymization fields, and retention durations for Payment/Refund, ConsentRecord, Notification, and Audit/security categories.
