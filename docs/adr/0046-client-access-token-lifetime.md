# 46. Use Short-lived One-time ClientAccess Tokens

## Status

Accepted for the MVP working model; exact rate limits, session revocation, recovery, and email provider behavior remain open.

## Context

Guest package scheduling needs repeat access without a full account, but a permanent link or long-lived token would expose booking data if forwarded or leaked. Email is the primary automated channel.

## Decision

Issue a one-time magic link/OTP valid for 15 minutes. Successful verification creates a package/Booking-scoped session valid for 30 minutes. Resending invalidates prior unconsumed tokens. The session may expose only the authorized package actions, such as viewing status, scheduling the next valid SessionEntitlement, and receiving transactional updates. It cannot enumerate other Client records or Bookings.

Token values are never stored or logged in plaintext; rate limits, replay protection, and audit context are required.

## Consequences

Positive:

- guest access remains usable for later package scheduling;
- leaked links have bounded lifetime and one-use semantics;
- scope is narrower than a UserAccount;
- resend/recovery can be explicit.

Costs and constraints:

- email delivery delay can cause expiry frustration;
- session/token revocation and support recovery are needed;
- rate limits must balance privacy and usability;
- URLs/OTP content must avoid clinical or sensitive details.

## Open follow-up

Define request/verification rate limits, session revocation/logout, changed-email recovery, duplicate-client handling, and exact audit fields.
