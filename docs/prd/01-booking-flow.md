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
- **Reference UX:** the supplied Ibunda screenshots are a field/layout reference only. They do not override Seraya's business scope or data boundary.

## Client flow

1. Client opens the website.
2. Client chooses **Login with Google**.
3. On first login, client completes their profile.
4. Required profile data is validated before the client can continue.
5. Client chooses **Konseling Individual**.
6. Client chooses the online service:
   - By chat — Rp99.000.
   - By call — Rp125.000.
7. Client chooses a future slot.
8. Client completes the counseling intake form.
9. Client reviews the booking summary: psychologist, service, mode, date/time, duration, price, and contact data.
10. Client confirms consent and submits.
11. System creates Booking + immutable OfferSnapshot + SlotHold + CapacityReservation atomically.
12. Booking enters `pending_manual_payment` and shows the manual payment handoff.

Offline individual counseling is outside the current online-service pricing decision. It must remain unpublished or clearly unpriced until its price, schedule, venue, and flow are confirmed.

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

- **No. WhatsApp is required** — this is a locked product decision.
- The remaining fields are reference-informed profile candidates, not yet individually marked as required by the product owner.
- The final form must explicitly decide whether each field is required, optional, or excluded before implementation.
- Do not collect a field only because another platform collects it; each field needs an operational purpose and approved privacy treatment.

### Address section — reference-informed fields

The profile reference shows a separate **Alamat Saya** section:

- Negara.
- Provinsi.
- Kota atau Kabupaten.
- Alamat.

For Seraya:

- Address should be collected only if it is needed for the selected individual offline service or another explicitly approved operational purpose.
- Address is not required for the current online By chat / By call service based on the current decision.
- Exact requiredness and visibility of address fields remain open until the offline service is defined.

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
| Multiple topics | Candidate intake field; final topic taxonomy belongs to the Website Content/Privacy review |
| Problem description | Candidate non-clinical intake field; do not store clinical narrative in MVP |
| Minimum 50 characters | Reference-only; not locked yet for Seraya |
| Returning client | Candidate profile/booking flag; define behavior before implementation |
| Expected outcome | Candidate field; must be checked against the no-clinical-record boundary |
| Informed consent | Keep as required, versioned consent acknowledgement |
| Continue to payment | Map to the manual invoice/WhatsApp payment handoff, not an online gateway |

## Account/profile data contract

### Required now

- Google identity authenticated through the login flow.
- Full name or approved display name.
- Verified account email.
- WhatsApp phone number.

### Reference-informed candidates — requirement still to decide per field

- Date of birth.
- Gender.
- Occupation.
- Education.
- Relationship/marital status.
- Religion.
- Country, province, city/regency, and address for offline operations only.

The profile screen may group these into **Profil Saya** and **Alamat Saya** cards like the reference, but visual similarity is not a requirement to collect every field.

## Booking-form data contract

### Required

- Selected individual service: `by_chat` or `by_call` for online launch.
- Selected future slot.
- Profile name, email, and WhatsApp phone number.
- Versioned informed consent acknowledgement.
- Safety/crisis acknowledgement where required by the approved consent copy.

### Candidate fields from the reference — not yet locked

- One or more counseling topics.
- Non-clinical short description.
- Returning-client flag.
- Expected outcome.

Until these are explicitly approved, the implementation must not make them blocking fields or store them as clinical records. If a description is enabled, it needs a short, non-clinical boundary message and a defined maximum length.

## Catalog

| Mode | Service | Price | Status |
|---|---|---:|---|
| Online | By chat | Rp99.000 | **Confirmed for launch scope** |
| Online | By call | Rp125.000 | **Confirmed for launch scope** |
| Offline | Individual counseling | Not specified | Keep unpublished/unpriced until confirmed |

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
- Address is not required for online By chat / By call.
- Exact requiredness of reference-informed fields is documented before implementation.

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

- If topics are enabled, multiple selections are supported and the topic taxonomy is versioned.
- If problem description is enabled, the UI states the non-clinical boundary and maximum length.
- The 50-character minimum from the reference is not adopted until explicitly approved for Seraya.
- Returning-client behavior is defined before the field becomes functional.
- Expected outcome is not stored as a clinical record.
- Informed consent is versioned and required before submission.

### Privacy boundary

- Google profile data is limited to approved account/contact fields.
- Phone/address data is used only for the approved operational purpose.
- No clinical notes, diagnosis, assessment results, transcripts, or session notes are accepted.
- Sensitive reference fields such as religion and gender are not silently made mandatory.

## Still open for this PRD

- Required/optional/excluded status for date of birth, gender, occupation, education, status, religion, and address fields.
- Whether topics, non-clinical description, returning-client flag, and expected outcome are included in launch.
- Final topic taxonomy and copy boundary.
- Offline individual counseling price, venue, schedule, and whether it is published at launch.
- Final Google SSO session, account-linking, recovery, and staff/client separation behavior.
- Final consent and safety copy.
- Add/review the two screenshot references as repository assets — now available under `docs-site/reference/screenshots/`.

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
- 2026-09-02: Mapped the Ibunda profile/address and counseling/payment references into explicit Seraya fields, preserving only the decisions that are actually locked.
- 2026-09-02: Confirmed screenshot files are available under `docs-site/reference/screenshots/`; exact field requiredness remains a product decision rather than an inference from the reference UI.

## Decision checkpoint

Before implementation changes, review only these questions:

1. Which profile fields besides WhatsApp are required at first booking?
2. Are topics, description, returning-client flag, and expected outcome part of launch?
3. Is offline individual counseling in launch, and if yes, what are its price, schedule, and address requirements?
4. Should the booking flow use the labels **By chat** and **By call**, or retain Indonesian labels in the UI?

Until these are answered, the locked implementation scope is Google login + required WhatsApp + online By chat/By call + 2-hour cutoff.

## Status of this PRD

**Ready for focused business review; not yet ready for implementation handoff.**

The locked decisions are implementation-ready. The candidate fields and offline branch remain explicitly open so the developer does not invent requirements.

## Notes

The reference screenshots are archived as visual inspiration and field inventory only. Seraya's final UI, copy, requiredness, privacy treatment, and data retention must be approved independently.

## Related

- `docs/PROJECT-OVERVIEW.md`
- `docs/WORKBOARD.md`
- `docs/prd/README.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/08-launch-gates.md`
