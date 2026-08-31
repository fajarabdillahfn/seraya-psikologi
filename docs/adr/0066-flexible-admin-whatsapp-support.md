# 66. Keep Admin WhatsApp as Flexible Manual Support

## Status

Accepted; this ADR supersedes the required timing/task semantics in ADR 0064. Email automation, optional WhatsApp-capable contact data, and optional manual WhatsApp support remain in the MVP.

## Context

The practice's Admin acts as a human helper for clients who have an active Booking, Appointment, or package. The Admin may start or continue a WhatsApp conversation based on operational need. Encoding one post-payment follow-up task, timing, frequency, or acknowledgement gate would turn a flexible service practice into an unnecessary product lifecycle.

## Decision

- Collect a WhatsApp-capable contact number only when the client supplies it for optional manual support; it is not required for Booking, confirmation, or lifecycle state.
- Send automated email for durable payment/Booking/Appointment notifications.
- Allow Admin to contact the client manually through WhatsApp whenever useful while the client has an active Booking, Appointment, or PackagePurchase.
- Do not require a WhatsApp follow-up trigger, frequency, assignment task, completion state, or client acknowledgement.
- Do not introduce an automated WhatsApp provider in MVP.
- WhatsApp messages do not confirm, cancel, reschedule, refund, or otherwise mutate Payment/Booking/Appointment state by themselves. Explicit Admin domain actions and internal records remain authoritative.
- Cancellation/refund conversations may be handled through WhatsApp and recorded minimally as CancellationRequest/CancellationDecision/RefundAction. Chat transcripts are not required domain records.

An optional internal support-contact log may be added for operations, but it is not a required lifecycle entity and must not contain clinical content.

## Consequences

Positive:

- Admin retains human judgment and flexibility;
- no artificial task queue or follow-up SLA is imposed;
- client has a practical support channel while an active service relationship exists;
- transactional truth remains in email/internal domain records.

Costs and constraints:

- Admin practice and response expectations remain operational policy;
- the optional contact number needs privacy/retention handling;
- any optional support log must stay minimal and non-clinical;
- the team cannot infer attendance or consent from WhatsApp silence.

## Open follow-up

Define number format/verification, contact-data retention, optional support-log policy, and manual communication guidance if the practice wants one.
