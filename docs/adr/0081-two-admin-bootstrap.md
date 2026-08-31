# 81. Bootstrap Two Admins for Recovery

## Status

Accepted for launch planning.

## Context

Staff access uses Google SSO plus explicit StaffMembership. A single Admin would create an avoidable operational dependency for invite/revoke and recovery, while a full break-glass system is unnecessary for the MVP.

## Decision

Bootstrap **two active Admin StaffMemberships** at launch. Either Admin may:

- invite/allowlist a staff identity;
- assign or revoke an active `StaffMembership`/RoleAssignment;
- deactivate the other Admin's staff access when there is a documented security/ownership reason;
- perform the existing Admin operational actions subject to audit.

No password fallback, shared account, credential copy, or undocumented bypass is introduced. Google account recovery remains the identity provider's responsibility; application-level staff recovery uses the other active Admin to restore/revoke membership. If both Admins lose access, the owner follows a separately maintained operational recovery runbook; its secrets are never stored in PRD artifacts.

## Consequences

Positive:

- avoids a single Admin access dependency;
- invite/revoke and staff recovery remain possible without a privileged backdoor;
- role changes remain explicit and audited.

Costs and constraints:

- two trusted Admin identities must be selected and maintained;
- each Admin has broad operational authority;
- deactivating the other Admin needs a reason/audit record;
- recovery runbook ownership remains an operational task outside the PRD.

## Open follow-up

Record the two Admin StaffMemberships during implementation/bootstrap, define re-authentication/session expiry, and maintain the owner recovery runbook outside source/PRD artifacts.
