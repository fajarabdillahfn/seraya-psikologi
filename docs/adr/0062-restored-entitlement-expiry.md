# 62. Restore Entitlements Without Resetting Expiry

## Status

Accepted for the MVP working model; exact Admin extension authority/SLA and client communication remain open.

## Context

An approved cancellation or Admin outcome correction can return a SessionEntitlement to usable state. Resetting or extending validity automatically would create a new commercial benefit and could undermine the package's published expiry policy.

## Decision

A restored SessionEntitlement retains the original PackagePurchase expiry boundary. If that boundary has passed, the entitlement remains expired/closed and is not automatically schedulable. An authorized Admin may grant a separate, explicit extension exception with reason, new expiry, policy/approval context, and audit; the extension does not rewrite the original purchase validity.

Sequence number and PackagePurchase binding remain unchanged. Refund/credit calculations use the original purchase snapshot plus the audited restoration/extension event.

## Consequences

Positive:

- expiry remains predictable and fair across cancellation/correction;
- restoration does not silently create extra validity;
- exceptional goodwill is explicit and auditable;
- package history retains original sequence and terms.

Costs and constraints:

- expired restoration needs a clear Admin workflow;
- entitlement state may need `closed` versus `expired` distinction;
- reminders and client access must reflect extension state;
- refund/credit calculations must consume the event history.

## Open follow-up

Define Admin extension authority/SLA, allowed extension triggers, client response/notification, and exact expired-versus-closed state vocabulary.
