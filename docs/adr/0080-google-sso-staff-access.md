# 80. Staff Access via Google SSO and Explicit Membership

## Status

Accepted for launch planning.

## Context

Seraya needs privileged access for Admin and Psychologist roles. A staff identity must not receive permissions merely because it uses a certain email address or logs in through an SSO provider.

## Decision

Use **Google SSO** for staff authentication at launch. Access requires all of:

1. an Admin-created invite/allowlist entry for the intended identity;
2. successful Google authentication;
3. an explicit active `StaffMembership`/`RoleAssignment` mapping the identity to `admin` or `psychologist`.

Google SSO authentication alone grants no role. Email domain matching, self-signup, self-selected role, or client login does not grant staff access. Editor is not enabled at launch under ADR 0079.

Role assignment, invite/allowlist changes, activation/deactivation, and privileged actions are audited. Staff authentication/session secrets and provider configuration are not stored in PRD artifacts.

## Consequences

Positive:

- familiar staff sign-in path without a separate password store;
- explicit membership prevents accidental privilege from SSO identity alone;
- role changes are auditable and reversible.

Costs and constraints:

- launch depends on Google identity availability and account ownership;
- Admin needs an invite/allowlist management path;
- account recovery and break-glass access still require an explicit operational rule;
- client optional Google linking remains separate from staff SSO.

## Open follow-up

Define Admin invite/revocation UI, session lifetime/re-authentication, recovery/break-glass policy, and the minimum initial Admin bootstrap procedure without putting credentials in PRD artifacts.
