# PRD 07 — Staff & Admin Operations

## Goal

Give authorized staff the minimum workspace needed to verify payment and operate bookings safely.

## Roles

- Admin: operational review and privileged commands.
- Psychologist: scoped access to relevant appointments/clients only.
- Client: scoped booking access; no global account required for MVP.

## Current state

The live MVP uses a clearly labeled placeholder auth gate for development. It is not production staff authentication.

## Production requirements

- Google SSO identity verification.
- Explicit StaffMembership record.
- Role assignment and two-Admin bootstrap.
- Session lifecycle: state/nonce, cookie, CSRF, re-authentication, revocation, and recovery.
- Audit trail for payment/cancellation/refund actions.

## Admin payment procedure

Receive proof in WhatsApp → identify booking → record proof → verify/reject → confirm client through the approved channel → retain evidence per approved policy.

## Acceptance checks

- Unauthenticated requests cannot reach privileged commands.
- Psychologist cannot see unrelated clients/bookings.
- Admin verification is atomic and idempotent.
- Last-Admin removal/recovery is protected.
