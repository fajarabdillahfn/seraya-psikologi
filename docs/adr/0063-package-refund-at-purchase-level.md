# 63. Keep Package Refunds Manual at Purchase Level

## Status

Accepted for the MVP working model; package refunds are purchase-level Admin decisions with launch outcomes full_refund/no_refund under ADR 0077. Exact Admin criteria, approval, gateway timing, and package credit/extension policy remain open; partial monetary refunds are deferred.

## Context

A ServicePackage is sold as one full-upfront commercial product. The practice does not want the system to infer a per-session price or automatically divide the package amount when only some entitlements are used. Catalog discounts, policy exceptions, and operational circumstances may make an equal split incorrect.

## Decision

Do not create a per-entitlement financial allocation in MVP. `PackagePurchase` snapshots the total captured package price/currency and policy references. Any package refund at launch is an explicit Admin `full_refund` or `no_refund` decision at the PackagePurchase/payment level, recorded as a RefundAction with amount, currency, reason/category, policy context, entitlement usage summary, actor/approval, and gateway/reconciliation status. Partial monetary refunds are not available in MVP; package credit/extension is a separate future policy decision.

The system must not automatically calculate a refund by equal session split, current catalog price, or entitlement count. Entitlement state remains operational; it informs Admin review but is not itself a financial price.

## Consequences

Positive:

- avoids inventing a false per-session price;
- supports package-level commercial judgment;
- historical total payment remains stable;
- refund decisions remain auditable and reversible through payment actions.

Costs and constraints:

- Admin must choose full_refund or no_refund and record reason;
- refunds cannot be fully automated from entitlement state;
- reporting needs to distinguish operational entitlement balance from financial refund outcome;
- policy/legal/accounting review remains necessary.

## Open follow-up

Define one-Admin approval/execution authority, client communication, gateway timing, full/no-refund caps, and credit/extension treatment. Partial monetary refunds require a future explicit policy decision.
