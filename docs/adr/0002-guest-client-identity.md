# 2. Allow Guest Booking with Optional Client Account

## Status

Accepted for the MVP working model; guest access is scoped by ADR 0020 and email-primary delivery by ADR 0021. Token lifetime is resolved by ADR 0046: one-time token 15 minutes, scoped session 30 minutes. Duplicate Client records remain separate by default with audited Admin merge/link (ADR 0047); rate limits, recovery, and account linking remain open.

## Context

The public website needs to support first-time visitors who may be hesitant to create an account before asking for mental-health support. The technical PRD currently says Google SSO, but making it mandatory would add identity friction and would turn an implementation preference into a product rule.

The system still needs a reliable way to verify contact ownership and let a guest access or manage a Booking without exposing another person's data.

## Decision

Allow a client to create a Booking as a guest after verified contact capture. A Google-backed UserAccount may be offered as an optional convenience, but it is not a prerequisite for booking.

Model the concepts separately:

- **Client** is the person receiving/seeking the service.
- **UserAccount** is a durable authentication identity and is optional for clients in MVP.
- **ClientAccess** is a limited, verified mechanism for a guest to access or manage a Booking.

The MVP working channel for ClientAccess is email automated magic link/OTP. WhatsApp is optional manual support for cancellation/refund and general help while a client has an active Booking/Appointment/package under ADR 0066; it is not an automated ClientAccess channel or lifecycle source of truth.

## Consequences

Positive:

- lower first-booking friction;
- Google is not treated as the only acceptable identity provider;
- client identity and authentication can evolve independently;
- the model supports future account linking without requiring it now.

Costs and constraints:

- guest access must be scoped, expiring, and protected against enumeration;
- contact verification, duplicate Client handling, and account linking need explicit rules;
- notifications become part of the access and recovery design;
- retention and deletion must cover guest contact data as well as account data.

## Open follow-up

Choose rate limits, recovery, and whether clients may link a UserAccount later. Email ClientAccess, optional flexible manual WhatsApp support, token lifetime, and default duplicate handling are resolved.
