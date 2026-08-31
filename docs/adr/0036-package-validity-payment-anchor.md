# 36. Start Package Validity at Verified Payment Success

## Status

Accepted for the MVP working model; validity starts at verified payment success with Asia/Jakarta semantics and a snapshotted boundary. Calendar-period arithmetic is resolved at the model level by ADR 0055. Exact duration values, end-of-month/local-boundary policy, extension, and restored-entitlement expiry are governed by ADR 0062 and remain open only for explicit Admin extension rules.

## Context

PackagePurchase and its SessionEntitlement units are created/activated after verified payment success. Starting validity at first Appointment would leave a purchased package without a deterministic expiry while the client delays scheduling; starting at catalog selection would expire a package that was never paid.

## Decision

PackageValidity starts at the authoritative verified PackagePayment success event. PackagePurchase snapshots the start instant, operational timezone semantics (`Asia/Jakarta`), validity configuration/version, and explicit expiry boundary. Unused SessionEntitlement units expire at that boundary unless an audited admin exception applies.

The expiry boundary must be visible before payment and in the guest package view.

## Consequences

Positive:

- purchased obligations have a deterministic lifetime;
- payment, entitlement, and expiry timelines align;
- catalog/policy changes cannot rewrite historical package expiry;
- package reminders can be scheduled from a stable anchor.

Costs and constraints:

- clients may lose time if they postpone scheduling;
- reminders and public copy must explain the anchor;
- date arithmetic and daylight/timezone semantics need tests;
- extension/restoration requires explicit policy and audit.

## Open follow-up

Choose exact duration values, end-of-month/local expiry boundary, extension approval, reminder offsets, and whether a restored entitlement retains or receives a new expiry.
