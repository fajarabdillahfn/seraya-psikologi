# PRD 02 — Payment Flow

## Goal

MVP collects payment manually without a payment gateway. The system gives the client a clear invoice and gives Admin a controlled verification action.

## Launch decision

- Payment gateway is **deferred**.
- Client pays via bank transfer or manual QRIS.
- Client sends proof to Admin via WhatsApp.
- Admin verifies in the Admin workspace.
- Only verified proof can move a booking to `confirmed`.

## Client flow

1. Booking is created with `pending_manual_payment`.
2. System generates a text invoice and a downloadable PDF invoice.
3. Client receives a WhatsApp deep-link with booking ID, amount, expiry, and instructions.
4. Client transfers money and sends proof to Admin.
5. Client waits for Admin confirmation.

## Admin flow

1. Admin opens the payment queue.
2. Admin records proof metadata: method, evidence URL/note, and booking.
3. Admin verifies or rejects the proof.
4. Verify atomically updates proof + booking; reject records the reason and closes the booking according to the accepted rule.
5. Every privileged action is audited.

## Data boundary

`payment_proof` is the launch payment record. It stores payment evidence metadata and verification status. It must not store unnecessary clinical content.

## Acceptance checks

- Invoice amount comes from the immutable OfferSnapshot.
- Invoice includes a real configured Admin number and real payment instructions before production.
- Same proof verification repeated is idempotent.
- A rejected proof cannot confirm a booking.
- Demo bank details and placeholder Admin auth never pass production launch gates.

## Later option

Midtrans remains a separate future adapter/decision. Do not mix gateway assumptions into this MVP flow.

## References

- `docs/adr/0097-whatsapp-manual-payment.md`
- `docs/adr/0068-midtrans-snap-launch-gateway.md` (deferred/superseded for current launch)
