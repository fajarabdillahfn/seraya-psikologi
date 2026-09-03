# ADR 0098 — Lightweight Launch Checklist

- Status: Accepted
- Date: 2026-09-02
- Scope: Seraya Psikologi MVP launch review

## Decision

Use `docs/prd/08-launch-gates.md` as the practical launch checklist for a small, single-maintainer MVP. It replaces the long G-1..G-14 list as the default review artifact while preserving the long-form gate document as historical/reference material.

The checklist has only three states:

- Needs setup/check
- Ready
- Later

It is run once before opening the site to real clients, and repeated after material changes to booking, payment, authentication, privacy, or deployment. It is not an enterprise governance process and does not require recurring ceremony.

## Rationale

- The initial client group is small and includes the maintainer's own household.
- The product owner and long-term technical maintainer are closely connected.
- A short checklist is more likely to be completed and kept accurate than a large gate matrix.
- Security, privacy, authentication, payment, and UAT checks remain present; they are not removed, only grouped into practical sections.
- Deferred product features remain visible as Later items and are not treated as launch blockers.

## Consequences

- `docs/prd/08-launch-gates.md` is the default launch artifact.
- `docs/adr/0096-launch-gate.md` remains a reference baseline; it is not deleted.
- A launch sign-off remains necessary, but it is one concise record with checked date, maintainer, decision, and accepted open items.
- If the business grows materially, the checklist can be expanded without changing the current product scope.

## References

- `docs/prd/08-launch-gates.md`
- `docs/WORKBOARD.md`
- `docs/adr/0096-launch-gate.md`
