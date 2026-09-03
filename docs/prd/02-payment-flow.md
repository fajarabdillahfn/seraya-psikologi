# PRD 02 — Payment Flow

Status: **Business review closed** on 2026-09-02. Implementation intentionally deferred.

## Goal

The MVP collects payment manually without a payment gateway. The flow lets the client transfer money, send proof to Admin via WhatsApp, and only then does Admin verify and generate the official invoice. Admin operations are the only path that can move a booking to `confirmed`.

## Launch decision (locked)

- Payment gateway is deferred. Midtrans and other Indonesian gateways are not in the launch path.
- Settlement is manual: bank transfer or manual QRIS to a Seraya-controlled account.
- The official PDF/text invoice is generated **after Admin verifies and approves the booking**, not before payment. The booking confirmation page at the end of the booking flow shows an intermediate "preliminary payment instructions" view that the client follows; the official invoice replaces it after approval.
- The system does not promise a confirmed appointment to the client before Admin approval.
- Chat and Call sessions are delivered through the Admin WhatsApp channel.

## Payment flow

1. Client completes the booking intake.
2. System creates the Booking, immutable OfferSnapshot, SlotHold, and CapacityReservation atomically.
3. System shows the client a preliminary payment view with the booking ID, total amount, payment method options (bank transfer and/or manual QRIS), the Seraya account details, the booking expiry, and the WhatsApp deep-link to Admin.
4. Client transfers the money to the Seraya account and sends proof (screenshot, photo, or text reference) to Admin via WhatsApp.
5. Admin checks the bank account for the incoming transfer.
6. Admin verifies the booking in the web admin dashboard and records the verification.
7. On verify, the system generates the official PDF and text invoice for the booking, marks the booking as `confirmed`, and emails or delivers the invoice to the client through the agreed channel.
8. Client is informed that the booking is confirmed and receives the official invoice.

## Invoice format

- Header: **Seraya Psikologi**.
- Required sections:
  - Booking identifier and issue date.
  - Client profile data (name, email, phone, address) and any required intake summary.
  - Psychologist and selected service (mode: Chat, Call, or Offline), date, time, duration, and location when applicable.
  - Package label and total amount in IDR.
  - Payment status and verification reference (e.g., verified by, verified at, payment_proof identifier).
  - Cancellation, contact, and privacy notices.
- The invoice PDF and plain text render from the immutable OfferSnapshot; the verified `payment_proof` reference is attached for audit.
- Invoice filenames use the booking identifier so a client can search by booking ID.

## Admin verification rules

- The Admin is the only source of truth for moving a booking to `confirmed`.
- Verification runs against the `payment_proof` record created from the WhatsApp conversation, not the web form alone.
- The web/dashboard must show every recorded verification attempt and the Admin actor, timestamp, and decision reason.
- Verification actions are idempotent and atomic. Repeated verifications with the same input do not create duplicate state changes.
- The dashboard is the only place the Admin may verify, reject, or annotate a payment.

## Amount mismatch handling

- **Underpayment**: Admin notifies the client to top up the difference. The booking remains in a held state and is not `confirmed` until the balance is settled. Admin may extend the slot hold if needed; if no top-up arrives, Admin may cancel the booking per the cancellation rules in PRD 05.
- **Overpayment**: Admin returns the difference to the client through a manual channel and records the returned amount in the payment_proof notes. The booking may be `confirmed` for the full price of the selected service; the refund is processed out of band and tracked as a separate `RefundAction` later.
- **Same amount (no fee)**: verify and confirm.
- **Excess appears in same transfer but under the same booking**: same as overpayment, but Admin is responsible for the return.

## Cancellation because no payment

- If the Admin receives no payment evidence, the Admin records a cancellation note in the admin dashboard's cancellation field.
- A booking with no cancellation note is treated as a payment in progress and is **not** automatically cancelled. The slot hold expires on its own (10-minute default from booking; PRD 04 may extend this with the schedule).
- A cancellation note in the admin dashboard is the explicit signal that the booking is being treated as not paid and is being closed.

## Channel and communication

- Automated channel: email for the official invoice and any system confirmation. The PRD defers provider selection (TBC-NOTIFY-01).
- Manual channel: WhatsApp with the Admin for the pre-confirmation payment conversation. WhatsApp is operational, not a system-of-record channel.
- All official confirmation goes through the system, not only through WhatsApp, so the client has a record in their email.

## Privacy and data boundary

- The `payment_proof` table stores: payment method, amount, evidence metadata, verification actor, verification timestamp, and status. It does not store raw WhatsApp transcripts, full bank account details beyond what is needed, or clinical content.
- The booking shows the minimum profile data needed to issue the invoice; the full profile is not duplicated into the invoice.
- Retention and privacy treatment follow PRD 06 and are production-gated, not enforced by this PRD.

## Data flow

```
Booking submission
  → System creates booking + OfferSnapshot + SlotHold + CapacityReservation
  → Booking state: pending_manual_payment
  → Client sees preliminary payment view (booking ID, amount, Seraya account, WhatsApp to Admin)
  → Client transfers money → notifies Admin via WhatsApp with proof
  → Admin checks bank account
  → Admin verifies in the web admin dashboard
    → System generates official invoice (PDF + text)
    → Booking state: confirmed
    → Client receives confirmation and official invoice
```

## Acceptance criteria

- Booking is `pending_manual_payment` immediately after submission; the client cannot see a confirmed state before Admin verification.
- The preliminary view shows booking ID, amount, Seraya account, booking expiry, and a WhatsApp deep-link to Admin.
- The official invoice is only generated after Admin verification; it is not shown on the preliminary view.
- Underpayment produces a recorded top-up request and the booking remains unconfirmed until settled.
- Overpayment produces a recorded manual return and a separate `RefundAction`; the booking can be confirmed at the service price.
- Cancellation because no payment is recorded as an explicit cancellation note in the admin dashboard; absence of note means the booking is in progress.
- The same Admin verification repeated does not create duplicate state changes.
- All verification, rejection, and refund actions are logged with actor, timestamp, and reason.
- WhatsApp is a manual communication channel only; it is not a system-of-record or state-change trigger.
- The invoice PDF and text render from the immutable OfferSnapshot and include the verified `payment_proof` reference.

## Still open for this PRD

- The exact Seraya bank account number, account holder, and bank/QRIS method labels that the client will see. Placeholder text is acceptable for the system, but the production deployment must replace it before going live.
- The exact WhatsApp message that the system generates and prefills for the client. Placeholder text is acceptable here as well, as long as it carries booking ID, amount, and expiry.
- Email provider and template copy (TBC-NOTIFY-01).
- Admin verification SLA. Today, it is “when the bank statement shows the transfer.” A target SLA may be added later, but it does not block this PRD.
- Audit retention window for `payment_proof` and the resulting invoice file.
- How the Admin dashboard surfaces the explicit "no payment, treat as cancelled" status when the slot hold has expired.
- Internal RefundAction flow (manual transfer) is referenced but not defined here; PRD 05 will cover it.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/06-privacy-consent.md`
- `docs/adr/0097-whatsapp-manual-payment.md`
- `docs/adr/0093-payment-settlement-uniqueness.md`

## Change log

- 2026-09-02: Rewrote PRD 02 to reflect the product-owner decision: client transfers first, sends proof via WhatsApp, Admin checks the bank, Admin verifies in the web dashboard, then the official invoice is generated and the booking is confirmed. Underpayment and overpayment handling is documented. The "no payment, treat as cancelled" rule is recorded as an explicit admin cancellation note rather than automatic cancellation.
