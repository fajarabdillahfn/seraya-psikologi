# 32. Assign Staff Roles Through Explicit Membership

## Status

Accepted for the MVP working model; invitation lifecycle, identity provider, and emergency admin recovery remain open.

## Context

Google SSO authenticates an identity but does not prove that the identity should be an Admin, Editor, or Psychologist. Self-selected roles or unrestricted domain-based mapping would grant more authority than intended.

## Decision

Represent internal access as StaffMembership/RoleAssignment. A staff identity must be invited or allowlisted and assigned an explicit role by an existing Admin. Role changes, suspension, and removal are audited. SSO success without an active membership yields no staff privileges. Client guest access remains separate from staff membership.

The system must support least privilege and deny-by-default for unknown or suspended staff identities.

## Consequences

Positive:

- authentication and authorization remain separate;
- no self-claimed admin/editor/psychologist role;
- role changes have an accountable owner and history;
- staff suspension can revoke access without deleting business history.

Costs and constraints:

- an initial admin bootstrap/recovery process is needed;
- invitation/allowlist management becomes an operational responsibility;
- multiple roles per person need deterministic permission union/deny behavior;
- identity provider subject IDs must be stored carefully and minimized.

## Open follow-up

Choose SSO provider, invitation acceptance flow, role removal/suspension semantics, multi-role precedence, and emergency recovery procedure.
