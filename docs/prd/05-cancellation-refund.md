# PRD 05 — Cancellation & Refund

## Locked business rule

- Client requests cancellation/refund through Admin WhatsApp.
- Website has no public cancellation/refund UI.
- Admin reviews case by case.
- Public refund outcomes are `full_refund` or `no_refund` only.
- Refund execution is separate from cancellation approval.

## System behavior

- CancellationDecision is append-only.
- Pending cancellation preserves the current appointment/reservation.
- Approval and eligible capacity release are one atomic command.
- Refund is a separate audited action.
- Pending-vs-outcome races follow the accepted cancellation matrix.

## Acceptance checks

- No public endpoint lets a client directly mutate cancellation/refund state.
- Admin actions have actor, timestamp, reason, and audit record.
- A repeated command is idempotent.
- Package and appointment targets follow the matrix in ADR 0095.

## Next work

Write the Admin operating procedure and evidence template; do not change the business rule without a new decision.
