# 43. Limit ServiceOffering Overrides to Effective Booking Values

## Status

Accepted for the MVP working model; exact admin UI and policy/eligibility schema remain open.

## Context

Service provides a shared public category/defaults while ServiceOffering is the psychologist-specific bookable variant. Allowing every field to vary would fragment policy and make public/operational semantics hard to reason about.

## Decision

A ServiceOffering may override these effective booking values:

- price and currency, subject to admin policy;
- duration;
- mode/location configuration allowed by the practice;
- TransitionBuffer.

Service/category identity, eligibility rules, consent/privacy requirements, crisis/disclaimer boundaries, and global cancellation policy remain controlled by Service/admin policy. The effective values are resolved before OfferSnapshot creation; later catalog changes do not mutate snapshots.

## Consequences

Positive:

- psychologist-level operational differences are expressible;
- policy and public taxonomy remain centralized;
- snapshot logic has a bounded field set;
- admin UI can clearly show inherited vs overridden values.

Costs and constraints:

- precedence and validation must be server-side;
- currency/mode combinations need policy validation;
- overrides need audit and future-slot impact handling;
- a later need for per-psychologist policy must be a deliberate model extension.

## Open follow-up

Define exact mode/location fields, price/currency constraints, eligibility representation, and whether admin approval is needed before an offering override becomes bookable.
