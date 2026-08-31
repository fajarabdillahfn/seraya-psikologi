# 10. Start with One Versioned Global Cancellation Policy

## Status

Accepted for the MVP working model; launch uses no automatic cutoff and Admin case-by-case review with full/no-refund outcomes. Partial refunds and percentages are deferred; exact provider capabilities remain implementation verification.

## Context

Cancellation and refund behavior affects Booking, Appointment, Payment, notifications, and staff operations. Allowing every service or psychologist to define separate rules before the business has proven the need would multiply edge cases and make the public policy difficult to explain.

## Decision

Use one configurable global CancellationPolicy for MVP. Version the policy; when a Booking/Appointment is created or confirmed, record the policy version that applies. Staff may have an explicitly audited override path for exceptional cases.

The policy uses no automatic cutoff for launch. Admin reviews requests case-by-case, records a versioned policy reference, and may approve/deny cancellation. RefundAction is separate and launch-limited to full_refund/no_refund; partial outcomes require a future policy.

## Consequences

Positive:

- one public policy to explain and test;
- consistent automation across services and psychologists;
- historical transactions retain the rule version used;
- exceptions are visible as overrides instead of hidden manual edits.

Costs and constraints:

- a policy change requires versioning and effective-date semantics;
- admin override permissions and audit entries are required;
- future per-service rules may require a migration from global policy references;
- refund gateway support and reconciliation remain necessary.

## Open follow-up

Define policy version/effective-date semantics, Admin exception authority, and package credit/extension handling. Launch full/no-refund behavior is resolved; partial monetary refunds require a future explicit policy.
