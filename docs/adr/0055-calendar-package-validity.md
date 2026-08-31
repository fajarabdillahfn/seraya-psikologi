# 55. Calculate Package Validity as a Calendar Period

## Status

Accepted for the MVP working model; allowed units/range and end-of-month behavior remain open.

## Context

Package validity is configured per ServicePackage and starts at verified payment success. Fixed-day arithmetic is precise but less understandable in public copy; a calendar period maps better to package language such as “valid for three months.”

## Decision

Represent validity as a calendar period configured per ServicePackage (for example, an integer number of months/approved units). At verified payment success, compute and snapshot a concrete expiry boundary using Asia/Jakarta policy semantics. The purchase displays both the configured period and concrete expiry. Catalog edits do not change existing PackagePurchase expiry.

End-of-month, leap-year, daylight/timezone, and boundary-at-midnight behavior must follow one tested calendar policy; the exact business values/allowed units remain open.

## Consequences

Positive:

- public package copy is understandable;
- historical expiry remains immutable;
- reminder and scheduling logic use a concrete timestamp;
- package-specific durations remain supported.

Costs and constraints:

- calendar arithmetic edge cases require tests;
- admin validation/range is needed;
- restored entitlement/extension rules must preserve or explicitly recalculate expiry;
- UI must avoid ambiguity around the final valid local date/time.

## Open follow-up

Define allowed units/range, end-of-month policy, local expiry time, extension/restore semantics, and exact package values.
