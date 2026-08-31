# 21. Use Email as Primary Transactional Channel

## Status

Accepted for the MVP working model; email is automated and Admin WhatsApp is optional flexible manual support while a client has active service (ADR 0066). No automated WhatsApp provider is required in MVP. Provider, sender identity, email retention, number verification, and optional support logging/guidance remain open.

## Context

Guest ClientAccess and transactional booking/payment notifications need a low-cost channel that supports links/OTP and can be automated. The initial budget is limited, and automated WhatsApp/SMS adds provider and operational constraints. Notifications must not include clinical content or unnecessary sensitive detail.

## Decision

Use email as the automated channel for ClientAccess and durable transactional notification. Admin may use WhatsApp manually for human support while a client has an active Booking, Appointment, or PackagePurchase; there is no required post-confirmation follow-up task or frequency (ADR 0066). WhatsApp is not a source of Payment/Booking/Appointment truth. Cancellation/refund requests may be handled manually there and recorded internally.

## Consequences

Positive:

- lower initial provider complexity/cost;
- email supports magic links and transactional templates;
- one automated channel simplifies retry/idempotency and observability;
- WhatsApp remains available for human support without coupling lifecycle to chat delivery.

Costs and constraints:

- email deliverability and sender reputation matter;
- users may not monitor email immediately;
- fallback support must verify identity before revealing booking data;
- message content must stay minimal and privacy-safe.

## Open follow-up

Choose email provider/sender domain, link/OTP lifetime, retry/backoff, bounce handling, WhatsApp-capable number verification/retention, and optional support-contact logging/guidance. No automated WhatsApp provider or required follow-up task is planned in MVP.
