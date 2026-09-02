# PRD 01 — Booking Flow

Status: Updated from product-owner decisions on 2026-09-02. Business review source.

## Goal

A client logs in, completes the required profile, chooses an individual counseling service, chooses a slot, completes the booking form, and receives the next payment instruction.

## Decisions locked

- **No guest booking.** A client must log in before booking.
- **Authentication:** Google SSO is the first supported login method.
- **Scope:** individual counseling only. Couple counseling is not part of the current checkout.
- **Phone number:** required in the client profile and available to the booking flow. It is not optional.
- **Booking cutoff:** booking closes 2 hours before session start.
- **Online counseling has two services:**
  - By chat — **Rp99.000**
  - By call — **Rp125.000**
- **Reference UX:** the supplied Ibunda screenshots are the approved reference for the required profile, address, and counseling-intake fields. They do not override Seraya's business scope or data boundary.
- **All reference profile/address fields are required** for the client profile.
- **All reference counseling-intake fields are required** for every booking.
- **Offline individual counseling is in launch scope.** Its price, schedule, venue, and exact service details are still required before implementation.

## Client flow

1. Client opens the website.
2. Client chooses **Login with Google**.
3. On first login, client completes their profile.
4. Required profile data is validated before the client can continue.
5. Client chooses **Konseling Individual**.
6. Client chooses the individual counseling mode:
   - Online → By chat — Rp99.000.
   - Online → By call — Rp125.000.
   - Offline → individual counseling; launch scope confirmed, with price/schedule/venue still to be configured.
7. Client chooses a future slot.
8. Client completes the counseling intake form.
9. Client reviews the booking summary: psychologist, service, mode, date/time, duration, price, and contact data.
10. Client confirms consent and submits.
11. System creates Booking + immutable OfferSnapshot + SlotHold + CapacityReservation atomically.
12. Booking enters `pending_manual_payment` and shows the manual payment handoff.

Offline individual counseling is **in launch scope**, but it must remain unpublished until its price, schedule, venue, and online/offline joining instructions are confirmed.

## Reference UX: profile and address

Source files:

- `docs-site/reference/screenshots/ibunda-mockup-profil-alamat.jpg`
- `docs-site/reference/screenshots/ibunda-mockup-konseling-pembayaran.jpg`

### Profile section — reference-informed fields

The profile reference shows these fields:

- Nama Panggilan.
- Tanggal Lahir.
- Jenis Kelamin.
- Pekerjaan.
- Pendidikan.
- No. WhatsApp.
- Status.
- Agama.

For Seraya:

- **All fields listed in the Profile and Address sections are required** for the client profile.
- This requiredness follows the product-owner decision on 2026-09-02 and the approved reference structure.
- The product still needs an approved operational purpose and retention treatment for each field.
- Do not add fields beyond this list without a new product decision.

### Address section — reference-informed fields

The profile reference shows a separate **Alamat Saya** section:

- Negara.
- Provinsi.
- Kota atau Kabupaten.
- Alamat.

For Seraya:

- All four address fields are required for every client profile because offline individual counseling is in launch scope.
- The approved profile UX groups them under **Alamat Saya**.
- The product must document the operational purpose and retention treatment for each address field before production.

## Reference UX: counseling intake

The counseling-form reference shows this sequence:

1. **Pilih Metode Konseling**.
2. Active Gmail instruction.
3. Topic selection with multiple choices.
4. Problem description.
5. Returning-client checkbox.
6. Expected outcome.
7. Informed-consent checkbox.
8. Continue to payment.

### Seraya mapping

| Reference element | Seraya decision |
|---|---|
| Chat | Keep as **By chat**, Rp99.000 |
| Voice call | Keep as **By call**, Rp125.000 |
| Video call | Exclude from current launch scope |
| Active Gmail | Login uses Google SSO; use the verified account email rather than asking for a second email by default |
| Multiple topics | **Required**; multiple selections are supported; final taxonomy must be versioned |
| Problem description | **Required**; non-clinical intake only; minimum 50 characters and defined maximum length |
| Minimum 50 characters | **Required** for the problem description |
| Returning client | **Required** yes/no field |
| Expected outcome | **Required** operational intake field; not a clinical record |
| Informed consent | Keep as required, versioned consent acknowledgement |
| Continue to payment | Map to the manual invoice/WhatsApp payment handoff, not an online gateway |

## Account/profile data contract

### Required for every client profile

- Google identity authenticated through the login flow.
- Nama panggilan.
- Tanggal lahir.
- Jenis kelamin.
- Pekerjaan.
- Pendidikan.
- Nomor WhatsApp.
- Status.
- Agama.
- Negara.
- Provinsi.
- Kota atau kabupaten.
- Alamat.

The profile screen uses two grouped sections: **Profil Saya** and **Alamat Saya**, following the approved reference structure. All listed fields are required before the client can book.

Address is collected because offline individual counseling is in launch scope. The product must still document the approved operational purpose and retention treatment for the address fields.

## Booking-form data contract

### Required

- Selected individual service: `by_chat` or `by_call` for online launch.
- Selected future slot.
- Profile name, email, and WhatsApp phone number.
- Safety/crisis acknowledgement where required by the approved consent copy.

### Required counseling intake for every booking

- One or more counseling topics; multiple selections are supported.
- Non-clinical problem description; minimum 50 characters, following the approved reference behavior.
- Returning-client flag.
- Expected outcome after counseling.
- Versioned informed consent acknowledgement.

The problem description and expected outcome are operational intake inputs only. They must not become clinical records, diagnosis, assessment results, transcripts, or session notes. The UI must display a clear non-clinical boundary and enforce a defined maximum length.

## Catalog

| Mode | Service | Price | Status |
|---|---|---:|---|
| Online | By chat | Rp99.000 | **Confirmed for launch scope** |
| Online | By call | Rp125.000 | **Confirmed for launch scope** |
| Offline | Individual counseling | **TBC-BOOKING-OFFLINE-01** | In launch scope; publication waits for price/schedule/venue/instructions |

There is no couple offering in the current checkout. There is no assessment offering in this PRD. There is no online video-call service in the current launch scope.

## Authentication and state model

Authentication/profile gate:

`anonymous` → `google_authenticated` → `profile_incomplete` → `profile_complete`

Booking/payment handoff:

`profile_complete` → choose individual service → choose slot → complete intake → `pending_manual_payment` → `awaiting_confirmation` → `confirmed`

A client must not reach the booking-submit command without an authenticated identity and a complete required profile. Google login alone does not create a booking. An authenticated client may only access their own profile and bookings.

## Validation and rules

- Reject unauthenticated booking attempts.
- Reject a profile without a WhatsApp phone number.
- Reject an invalid phone number.
- Reject missing name, verified email, consent, or required safety acknowledgement.
- Reject non-individual, unpublished, inactive, or unpriced offerings.
- Reject slots at or within 2 hours of session start.
- Reject withdrawn, expired, or conflicting slots.
- Price and service identity are copied to an immutable OfferSnapshot at booking time.
- Do not use Google identity as permission to access another client's booking.
- Do not store diagnosis, assessment result, transcript, clinical notes, or session narrative.
- If reference-informed intake fields are introduced, each field must have a declared purpose, retention treatment, and owner approval.

## Acceptance criteria

### Authentication

- Anonymous client sees the Google login gate before booking.
- A client who cancels login cannot submit a booking.
- A new Google user is routed through profile completion.
- A returning Google user with a complete profile can continue to service selection.
- An authenticated client cannot enumerate another client's profile or booking.

### Profile

- WhatsApp phone number is required before booking.
- Invalid or missing phone blocks booking with a clear error.
- Verified Google email is shown in the booking summary.
- Profile is grouped into Profile and Address sections if the final UX keeps the reference structure.
- All profile and address fields listed in this PRD are required before booking.
- The required fields are grouped as **Profil Saya** and **Alamat Saya**.

### Catalog and booking

- Only individual counseling appears in the launch booking flow.
- Online mode displays exactly two choices: By chat Rp99.000 and By call Rp125.000.
- Video call and couple counseling are absent from the current checkout.
- Price is visible before slot confirmation.
- A slot inside the 2-hour cutoff is not selectable or is rejected server-side.
- Booking creation is atomic across Booking, OfferSnapshot, SlotHold, and CapacityReservation.
- Repeating the same write request does not create duplicate booking records.
- Confirmation shows booking ID, hold expiry, selected service, amount, and manual payment handoff.

### Reference-informed intake

- Multiple counseling topics are required and support multiple selections.
- Problem description is required and has a minimum of 50 characters, plus a defined maximum length.
- Returning-client flag is required as an explicit yes/no answer.
- Expected outcome is required as operational intake data.
- Informed consent is versioned and required before submission.
- Problem description and expected outcome are not clinical records; the UI must state this boundary.

### Privacy boundary

- Google profile data is limited to the approved account/contact fields.
- Phone/address data is required for the profile and used for the approved operational purpose, including offline counseling operations.
- No clinical notes, diagnosis, assessment results, transcripts, or session notes are accepted.
- Sensitive profile fields are mandatory because the product owner explicitly approved all reference profile fields; purpose, retention, and privacy copy must be documented before production.

## Still open for this PRD

- Final topic taxonomy and copy boundary.
- Offline individual counseling price, venue, schedule, and exact joining/instruction details.
- Final Google SSO session, account-linking, recovery, and staff/client separation behavior.
- Final consent and safety copy.
- Document approved purpose, retention, and privacy copy for all required profile/address fields.

## References

- `docs-site/reference/screenshots/README.md`
- `docs-site/reference/screenshots/ibunda-mockup-profil-alamat.jpg`
- `docs-site/reference/screenshots/ibunda-mockup-konseling-pembayaran.jpg`
- `docs/prd/02-payment-flow.md`
- `docs/prd/03-website-content.md`
- `docs/prd/04-availability-scheduling.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/prd/08-launch-gates.md`
- `docs/adr/0080-google-sso-staff-access.md`
- `docs/adr/0094-intake-eligibility-cutoff.md`
- `docs/adr/0097-whatsapp-manual-payment.md`

## Change log

- 2026-09-02: Removed guest booking; Google SSO required; WhatsApp phone required; cutoff changed from 1 hour to 2 hours; couple removed from current checkout; online catalog changed to By chat Rp99.000 and By call Rp125.000.
- 2026-09-02: Mapped the Ibunda profile/address and counseling/payment references into explicit Seraya fields.
- 2026-09-02: Locked all visible profile/address fields and all visible counseling-intake fields as required; added offline individual counseling to launch scope.
- 2026-09-02: Confirmed screenshot files are available under `docs-site/reference/screenshots/`; all visible profile/address and counseling-intake fields are now required by product decision.

## Decision checkpoint

Before implementation changes, review only these questions:

1. What is the offline individual counseling price?
2. What is the offline schedule and venue/address requirement?
3. What are the online/offline joining instructions?
4. Should the UI use the labels **By chat** and **By call**, or Indonesian labels?

Until these are answered, the locked implementation scope is Google login + all required profile/intake fields + individual online By chat/By call + individual offline launch branch + 2-hour cutoff.

## Status of this PRD

**Ready for focused business review; not yet ready for implementation handoff.**

The required fields and launch branches are now product-approved. Implementation remains blocked only by the concrete offline price/schedule/venue/instruction values and the operational/privacy copy needed to publish them.

## Notes

The reference screenshots are archived as visual inspiration and field inventory only. Seraya's final UI, copy, requiredness, privacy treatment, and data retention must be approved independently.

## Related

- `docs/PROJECT-OVERVIEW.md`
- `docs/WORKBOARD.md`
- `docs/prd/README.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/08-launch-gates.md`
