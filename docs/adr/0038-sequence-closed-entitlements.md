# 38. Advance Package Sequence Past Closed Entitlements

## Status

Accepted for the MVP working model; expired/closed units are skipped and restored cancellation retains sequence. Restoration expiry/extension is resolved by ADR 0062; exact closed-state vocabulary, closure authority, and refund/credit display remain open.

## Context

Sequential scheduling gives a clear next session, but an entitlement may become permanently unavailable through expiry or an approved operational closure. Blocking all later units would make one expired/closed unit strand the rest of a paid package.

## Decision

Normal scheduling selects the lowest sequence-numbered entitlement that is still available and valid. Entitlements in terminal `expired`/`closed` state are skipped and do not block later units. An authorized admin may restore/reopen or override sequence only through an audited action, subject to PackageValidity and policy.

A cancelled appointment whose entitlement is approved for restoration returns to its original sequence; it is not treated as closed.

## Consequences

Positive:

- one expired/closed unit cannot strand the package;
- package progress remains usable and explainable;
- restoration preserves history and sequence;
- client UI can show skipped/closed units separately from remaining balance.

Costs and constraints:

- “expired”, “closed”, “cancelled/restored”, and “consumed” need distinct states;
- refund/credit must account for skipped units;
- admin overrides require strict permission/audit;
- notifications should explain why a sequence was skipped if visible to the client.

## Open follow-up

Define terminal state names, who can close an entitlement, whether closed units receive credit/refund, and client-facing display. Restoration sequence/expiry is resolved by ADR 0062.
