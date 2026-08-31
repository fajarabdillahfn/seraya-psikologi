# 37. Schedule Package Sessions in Sequence

## Status

Accepted for the MVP working model; normal sequence, Admin override capability, expired/closed-unit skipping, and restored original sequence/expiry are resolved by ADR 0037/0038/0062. Transfer/amendment and additional Admin override limits remain open.

## Context

A package has multiple equivalent-looking SessionEntitlement units, but clients and staff need an unambiguous “next session” for balance, reminders, cancellation restoration, and progress. Allowing arbitrary unused units to be scheduled can create gaps and confusing history.

## Decision

Each SessionEntitlement has an immutable `sequence_number` within its PackagePurchase. Normal client scheduling selects the next available sequence in order. An authorized admin may override the order only with an audited operational reason. A cancelled/restored entitlement retains its sequence unless an explicit correction policy says otherwise.

Sequence is an operational package rule, not a clinical treatment plan.

## Consequences

Positive:

- remaining balance and guest UI have a clear next action;
- reminder and expiry logic can identify the next session;
- cancellation restoration is deterministic;
- package history is easier to reconcile.

Costs and constraints:

- admin override and correction semantics are required;
- a blocked/expired earlier entitlement may affect later scheduling;
- APIs must enforce sequence server-side;
- future package types may need a deliberate exception.

## Open follow-up

Define transfer or package amendment behavior and any additional limits on Admin sequence override. Restoration sequence/expiry is resolved by ADR 0062.
