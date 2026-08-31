# 42. Snapshot Offering Values at Booking Payment Intent

## Status

Accepted for the MVP working model; exact quote expiry display and amendment/refund edge cases remain open.

## Context

ServiceOffering catalog values can change while a client is in checkout. Reading the latest price/duration at webhook success could charge a different amount from the displayed quote or change the Appointment duration after a SlotHold was made.

## Decision

When a Booking and payment intent are created, capture an immutable OfferSnapshot containing effective price/currency, duration, TransitionBuffer, mode, and relevant offering/policy version references. The snapshot remains authoritative for the SlotHold/payment attempt. Payment amount must equal the snapshot; verified webhook success must not reread current catalog price. PackagePurchase and Appointment copy or reference the snapshot needed for their own history.

If the hold expires, the quote expires with it and a new Booking/payment intent must create a fresh snapshot. Admin changes affect future bookings, not an active held quote.

## Consequences

Positive:

- client sees and pays the same amount;
- payment/webhook retries are deterministic;
- historical duration/buffer remains stable;
- catalog edits do not mutate in-flight transactions.

Costs and constraints:

- snapshot schema/versioning is required;
- stale quote messaging is needed after expiry;
- refunds need the charged snapshot, not current catalog values;
- package price/count/validity snapshots must be distinct from mutable catalog defaults.

## Open follow-up

Define exact snapshot fields, quote display/acceptance, amendment behavior before payment, and rounding/currency rules.
