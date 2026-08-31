# 9. Include Minimal Transactional Notifications

## Status

Accepted for the MVP working model; email is the automated channel, Admin WhatsApp is flexible manual support while the client has active service, and client acknowledgement is not a confirmation gate (ADR 0066). Appointment reminders default to 24 hours + 2 hours (ADR 0052/0053). Provider/sender identity, manual guidance, retry/failure, and opt-out details remain open.

## Context

Guest booking and payment need a reliable way to communicate confirmation, expiry, cancellation, and relevant reminders. A browser success page is not a durable communication channel. Marketing campaigns are a different product concern and may require different consent and delivery controls.

## Decision

Include minimal transactional notifications in MVP. Model:

- **Notification** as the intent/content contract tied to a business event or state change;
- **DeliveryAttempt** as a channel-specific attempt/result with provider reference, retry state, and redacted failure reason.

Initial notification categories should cover payment/booking confirmation by email, hold/payment expiry, cancellation or change, and Appointment reminders at 24 hours and 2 hours before start. Admin may additionally use manual WhatsApp support while the client has active service; this has no required trigger/frequency and no acknowledgement gate. Do not include marketing campaigns in this scope.

The system should keep booking/payment truth independent from delivery success: a notification failure must not silently roll back a confirmed Appointment, but it must be observable and recoverable.

## Consequences

Positive:

- guest clients receive durable status communication;
- delivery retries and provider changes have a clear model;
- notification failure does not corrupt booking/payment state;
- marketing and transactional consent remain separate.

Costs and constraints:

- channel selection and provider outage handling need policy;
- notification content must avoid clinical detail;
- contact data and provider references need retention/redaction rules;
- reminder timing and timezone behavior need explicit decisions.

## Open follow-up

Choose sender identity, retry/fallback policy, package-expiry reminder offsets, opt-out/mandatory semantics, provider quotas/failure behavior, and optional manual WhatsApp support guidance. Email automation, flexible WhatsApp support, and Appointment offsets are resolved; no required task or acknowledgement gate exists.
