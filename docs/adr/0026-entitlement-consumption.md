# 26. Consume Package Entitlements by Operational Outcome

## Status

Accepted for the MVP working model; correction authority is resolved by ADR 0054. `completed`/`no_show` consumption and approved-cancellation non-consumption are resolved by ADR 0026/0027/0028. Restored entitlement retains original expiry under ADR 0062; only explicit Admin extension can change it.

## Context

A package needs a reliable remaining-session balance. Consuming an entitlement at booking/confirmation would make an approved cancellation look used; consuming it automatically on every no-show would encode a business penalty before policy is decided.

## Decision

- `completed` consumes the related SessionEntitlement.
- An approved `cancelled` Appointment does not consume it and may return it to usable state if the package remains valid.
- an authorized psychologist/admin marking `no_show` after the 15-minute grace period consumes it by default; an admin may reverse/override through an audited action;
- Consumption and reversal/correction must be audited and idempotent.

No clinical information is needed to make this decision.

## Consequences

Positive:

- remaining-session balance matches operational outcomes;
- cancellation review can restore an unused entitlement safely;
- no-show policy is explicit and communicated before purchase;
- package refund/credit calculations have a defined input.

Costs and constraints:

- no-show policy must be communicated before purchase;
- correcting a completed/no-show outcome may change entitlement balance and require audit;
- concurrent scheduling/cancellation/outcome updates need idempotency;
- expiry interacts with restored entitlements.

## Open follow-up

Define explicit Admin extension/credit/refund behavior for a restored entitlement whose original expiry has passed; original-expiry retention is resolved by ADR 0062.
