# 64. Use Required WhatsApp Follow-up for Paid Confirmed Bookings

## Status

Superseded by ADR 0066 for timing/task semantics. The cancellation/refund handling stays on Admin WhatsApp only and is not surfaced in the public website; the business confirms this in the 2026-08-31 round.

## Context

Cancellation/refund handling is too policy-heavy to expose as a self-service flow. The practice prefers human Admin contact after a booking is paid and confirmed. Email remains useful for durable transactional evidence and ClientAccess, while WhatsApp is the practical channel for a human confirmation/follow-up conversation.

## Decision

Collect a required WhatsApp-capable contact number during Booking. After verified payment success and Appointment/Booking confirmation:

1. send the normal minimal transactional email notification;
2. create a WhatsApp confirmation/follow-up task for Admin;
3. Admin contacts the client through WhatsApp to confirm operational details and provide support;
4. cancellation/refund requests and decisions are handled manually through that support path, then recorded internally as CancellationRequest/CancellationDecision/RefundAction where applicable.

The follow-up is best effort. Client acknowledgement is not required for the Appointment to remain confirmed; only explicit domain actions may change its state.

WhatsApp communication is not Payment, Booking, or Appointment source of truth. A WhatsApp delivery failure or unanswered follow-up does not silently change domain state. No clinical detail is required in the message/task.

MVP does not require automated WhatsApp lifecycle delivery; if automation is added later, it must remain an adapter/DeliveryAttempt behind the same domain truth and privacy rules.

## Consequences

Positive:

- client receives a human contact point after purchase;
- cancellation/refund policy stays out of self-service UI;
- the business can clarify operational details before the session;
- email and internal records preserve durable status/audit.

Costs and constraints:

- WhatsApp-capable number becomes required booking data;
- Admin follow-up needs an assignment/status/task record;
- response time and manual script become operational policy;
- phone/contact retention and identity verification need privacy handling.

## Open follow-up

Define number verification/format, Admin follow-up SLA/statuses, message script/content, provider/automation decision, and escalation when the client cannot be reached.
