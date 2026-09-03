# PRD 08 — Launch Checklist

Status: **Working checklist** (2026-09-02). This is intentionally lightweight for one long-term maintainer.

## How to use this checklist

There are only three statuses:

- `[ ]` **Needs setup/check** — must be completed before real clients use the site.
- `[x]` **Ready** — checked with real information or a working test.
- `[-]` **Later** — intentionally deferred; not a launch blocker for the current MVP.

Do not turn this into a recurring bureaucracy. Run it once before launch, and again only after a material change to payment, authentication, booking, or privacy.

## A. Real information

- [ ] Replace all demo payment instructions with the real bank/QRIS information.
- [ ] Confirm Admin WhatsApp number and test the link from a real phone.
- [ ] Confirm Fuja's published profile, credentials, and publication approval.
- [ ] Confirm the real availability calendar: Monday–Sunday, closed on public holidays, 09.00–12.00 and 16.00–20.00 WIB.
- [ ] Confirm Havana Park address and the client arrival/check-in instruction.
- [ ] Replace visual placeholders when the real logo/photos/assets are ready.
- [ ] Review all public copy once in Bahasa Indonesia, including prices and contact details.

## B. Client booking test

- [ ] New client can log in with Google SSO.
- [ ] Guest cannot book.
- [ ] New client is required to complete all profile and address fields.
- [ ] Client must provide a valid WhatsApp number.
- [ ] Client can choose only Individual Counseling.
- [ ] Online options show Chat (Rp99.000) and Call (Rp125.000).
- [ ] Offline option shows Rp200.000, Havana Park, and the approved hours.
- [ ] All counseling intake fields are required.
- [ ] Slot cutoff rejects bookings less than 2 hours before start.
- [ ] Booking confirmation shows the correct service, time, amount, and WhatsApp payment handoff.
- [ ] Client cannot see an appointment as confirmed before Admin verification.

## C. Payment and Admin test

- [ ] Client sends transfer proof to Admin via WhatsApp.
- [ ] Admin can record the proof in the dashboard.
- [ ] Admin checks the incoming transfer in the bank/QRIS account.
- [ ] Admin can verify or reject the payment in the dashboard.
- [ ] Official PDF/text invoice is generated only after verification.
- [ ] Client receives confirmation after verification.
- [ ] Underpayment is recorded and the client is asked to top up.
- [ ] Overpayment is returned manually and the refund proof is recorded.
- [ ] A payment rejection has a reason and is visible in the booking history.
- [ ] Repeating a verification does not create duplicate records.

## D. Cancellation/refund test

- [ ] Client is directed to Admin WhatsApp; there is no public cancellation form.
- [ ] Admin can record a cancellation request and upload the WhatsApp screenshot.
- [ ] Cancellation status is visible in the dashboard.
- [ ] Admin can approve/reject with a reason.
- [ ] Approved cancellation releases the slot according to the cancellation rule.
- [ ] Refund transfer proof can be uploaded.
- [ ] Refund cannot be marked complete without refund evidence.
- [ ] Cancellation/refund history shows actor, time, reason, and evidence.

## E. Staff access

- [ ] Superadmin account is configured and tested.
- [ ] At least one Admin account is configured and tested.
- [ ] Psychologist account can see only their own relevant appointments and shared fields.
- [ ] Psychologist cannot verify payments or manage refunds.
- [ ] Admin cannot manage staff roles unless explicitly granted Superadmin access.
- [ ] Placeholder authentication is disabled before real clients use the site.
- [ ] Removing the last Admin or Superadmin is protected.

## F. Privacy and safety

- [ ] Informed Consent copy is reviewed and replaces the placeholder.
- [ ] Privacy Notice copy is reviewed and replaces the placeholder.
- [ ] Safety/Crisis copy is reviewed and replaces the placeholder.
- [ ] Terms and Conditions include the WhatsApp-only cancellation/refund policy.
- [ ] Client can request access, correction, or deletion by email.
- [ ] Client data is not visible to another client.
- [ ] No clinical notes, diagnosis, assessment results, transcripts, or treatment notes are collected.
- [ ] A test confirms that sensitive fields are not printed in logs.

## G. Basic operational readiness

- [ ] Admin knows where to find payment, cancellation/refund, booking, and schedule queues.
- [ ] Admin knows how to handle underpayment and overpayment.
- [ ] Admin knows the response target: within 1 hour during 08.00–20.00 WIB; outside that window, respond in the next window.
- [ ] Admin has a simple backup/export procedure for D1 data.
- [ ] One restore test has been performed or explicitly accepted as a post-launch task.
- [ ] Error pages do not expose stack traces, secrets, or internal database details.
- [ ] A real end-to-end booking has been completed with a test payment and then cleaned up.

## Later — not a current launch blocker

- [-] Midtrans or another payment gateway.
- [-] Automated WhatsApp integration.
- [-] Couple counseling checkout.
- [-] Clinical record or EMR.
- [-] CMS/editor for public content.
- [-] Newsletter or marketing opt-in.
- [-] Guardian route for ages 16–17.
- [-] Advanced analytics, structured data, and a formal on-call rotation.

## Simple sign-off

Before opening the site to real clients, the maintainer records one line:

> **Launch decision:** Ready / Not ready
> **Checked on:** YYYY-MM-DD
> **Checked by:** name
> **Open items accepted:** short list

The launch decision is not “production-ready forever”. Re-run sections B–G after a material change to booking, payment, authentication, privacy, or deployment.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/adr/0096-launch-gate-checklist.md`

## Change log

- 2026-09-02: Replaced the long G-1..G-14 launch-gate list with a lightweight maintainer checklist covering real information, client booking, payment, cancellation/refund, staff access, privacy/safety, and basic operations.
- 2026-09-02: Preserved deferred features as explicit Later items rather than launch blockers.

## Status

**Ready for business review.** This checklist is a practical release aid, not an enterprise governance process.

## Related

- `docs/PROJECT-OVERVIEW.md`
- `docs/WORKBOARD.md`
- `docs/prd/README.md`
- `docs/prd/01-booking-flow.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/adr/0096-launch-gate.md`
- `docs/adr/0097-whatsapp-manual-payment.md`
