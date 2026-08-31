# 20. Scope Guest Access to the Booking or Package

## Status

Accepted for the MVP working model; email is the primary automated channel for ClientAccess. WhatsApp is optional flexible manual support under ADR 0066, not an automated fallback/source of lifecycle truth. Token lifetime is resolved by ADR 0046: one-time token 15 minutes, scoped session 30 minutes. Replay protection, rate limits, revocation, recovery, and account linking remain open.

## Context

Guest clients need to return later to schedule remaining SessionEntitlement units without being forced into a Google account. A raw Booking ID or permanent link would create an enumeration/data-exposure risk, while a full account requirement adds first-booking friction.

## Decision

Use verified magic link or OTP access scoped to the relevant Booking/package. The access capability may show and mutate only actions allowed for that Booking/package, such as scheduling an unused entitlement and viewing appointment status. Cancellation/reschedule requests route to WhatsApp/manual support rather than self-service mutation. It must not expose a global Client record or other bookings.

Email is the primary automated channel for ClientAccess. WhatsApp is optional flexible manual support under ADR 0066 and is not an automated lifecycle source. Token lifetime is resolved by ADR 0046; rate limits, replay protection, revocation, recovery, and optional account linking remain open.

## Consequences

Positive:

- package follow-up works for guest clients;
- access scope is narrower than a full account;
- Google is not a prerequisite;
- package operations can be audited against ClientAccess context.

Costs and constraints:

- notification delivery becomes part of access reliability;
- token/OTP security, rate limits, and enumeration resistance are required;
- a lost/changed contact path needs recovery policy;
- staff support must avoid revealing package data before verification.

## Open follow-up

Define rate limits, replay protection, logout/revocation/recovery behavior, and whether clients may link a UserAccount later.
