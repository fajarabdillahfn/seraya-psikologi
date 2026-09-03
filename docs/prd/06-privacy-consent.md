# PRD 06 — Privacy & Consent

Status: **Business review closed** on 2026-09-02. Implementation intentionally deferred.

## Goal

Collect only the data needed to book and operate a session, while making the boundary visible to the client. The product does not store clinical notes, diagnosis, assessment results, transcripts, or treatment notes.

## Data boundary

The MVP stores the following categories of data:

- **Client profile data** (see PRD 01): full name, preferred name, date of birth, gender, occupation, education, WhatsApp phone number, status, religion, country, province, city/regency, address. The profile is captured during the first login and reused for every booking.
- **Booking and intake data**: the selected individual service, selected slot, intake answers (counseling topics, problem description, returning-client flag, expected outcome), the immutable OfferSnapshot, the slot hold record, and the capacity reservation.
- **Consent record**: the versioned Informed Consent accepted by the client for each booking, with the consent text and timestamp.
- **Payment evidence**: payment method, amount, evidence metadata, verified-by reference, verified-at timestamp, and status. The full transcript of any WhatsApp conversation about the payment is not stored.
- **Cancellation and refund records**: status, decision reason, evidence (WhatsApp screenshot and transfer proof), actor, and timestamp.
- **Operational audit records**: every privileged action (login, profile change, booking action, payment verification, cancellation/refund decision, withdrawal) records actor, timestamp, and a short reason.
- **Communication log metadata**: email delivery status, WhatsApp deep-link usage, without the message body.

The MVP does **not** store:

- Clinical notes, diagnosis, assessment results, transcripts, or treatment notes.
- Crisis intake, triage, risk scoring, or case management.
- The full body of WhatsApp conversations; only the screenshot evidence of a request is stored.
- Mental-health or sensitive-biodata categories that are out of scope for the booking product.

## Data access

- The **client themselves** is the only party that can read and update their own profile, their own bookings, and their own payment/cancellation records through the web and email channels.
- The **Admin team** has access to all client profile, booking, payment, and cancellation records that exist on the platform. This access is required to operate the manual payment/refund flow and to respond to client requests.
- The **Admin shares data with the psychologist only as needed** for an individual booking. When a booking reaches `confirmed`, the psychologist (Fuja Rahayu Kinanti for launch) receives the client display name, WhatsApp number, selected mode (`Chat`, `Call`, or `Offline` at Havana Park), scheduled slot, counseling topics, non-clinical problem description, expected outcome, and returning-client flag. The psychologist does not see full address, religion, occupation, education, or payment evidence.
- Sharing with the psychologist is recorded in the booking audit trail: actor (`admin` or `system`), timestamp, booking reference, and the list of fields shared.
- All other roles, including any future psychologist, do not have access to client data until the Admin explicitly grants it.
- A client does not gain any access to another client’s profile or booking, even if they share a session or a couple booking.

## Client rights

- **Data access**: the client can ask Admin to provide a copy of their profile and their booking history. Admin delivers this through the Admin email channel.
- **Data correction**: the client can ask Admin to correct or update their profile data. Admin applies the change and records it in the audit trail.
- **Data deletion**: the client can ask Admin to delete their data. Admin evaluates the request against the retention policy below; data that is outside the legal or operational retention window is deleted. Data that must be retained for accounting, legal, or audit reasons is retained only for the required window and is clearly identified to the client.
- **Response channel**: the client sends a deletion request to Admin by email. Admin responds with the result of the request, including which fields were deleted and which were retained, by email.
- The booking record itself, including the immutable OfferSnapshot and the payment/cancellation audit trail, is retained even if the profile is deleted, because the booking is a transactional record and the proof of payment is required for accounting and legal reasons.

## Data breach notification

- If Seraya becomes aware of a data breach that exposes client profile, booking, or payment data, the affected clients are notified by email.
- The notification is sent as soon as practical, with the data affected, the impact, and the mitigation steps.
- The notification timeline, escalation, and incident response procedure are owned by PRD 07 (Staff/Admin) and are operational rather than business requirements.

## Retention

The retention policy is defined per data category. The default is the minimum necessary for operational, accounting, and audit needs.

- **Client profile data**: retained while the client has any booking on the platform. After the last booking closes, profile data may be deleted on request, or may be retained for up to 12 months to support rebooking, then deleted.
- **Booking and intake data**: retained for at least 12 months after the booking closes, to support the audit and any rebooking or repeat-counseling context.
- **Payment evidence**: retained for at least 12 months to support accounting, audit, and any dispute. Longer retention may be required by accounting or tax law.
- **Cancellation and refund records**: retained for at least 12 months after the refund completes, or longer if required by accounting or tax law.
- **Consent record**: retained for at least 12 months after the last booking that used it.
- **Operational audit records**: retained for at least 12 months after the action.

Concrete retention durations and the rationale are owned by PRD 07 and are operational. This PRD records the *minimum* retention as the contract with the client; the operational implementation may use longer retention where required by law or audit.

## News and marketing

- There is **no marketing or newsletter** in the launch scope.
- No opt-in or opt-out for news/marketing is required for the launch.
- If news/marketing is added later, it must be a new PRD that adds an explicit opt-in.

## Minor policy (ages 16–17)

- For launch, only adults (18+) are accepted for self-service booking.
- Ages 16 and 17 are not accepted in the current launch scope. There is no guardian route enabled in the launch implementation.
- A separate PRD is required if the guardian route is enabled later, including consent capture, identity verification of the guardian, and a separate legal review.

## Final copy placeholder

The following public copy is required for launch and is currently a placeholder. The product owner will replace the placeholder before the production sign-off.

- **Informed Consent**: the versioned consent text shown to the client before booking, in Bahasa Indonesia. It must cover what data is collected, who can see it, how it is used, the client’s right to ask for access or deletion, and the explicit acknowledgement that counseling is not a substitute for medical or emergency care.
- **Privacy Notice**: the public page that explains the data categories, the access model, the retention minimums, the client’s rights, the breach notification path, and the contact channel. It links to the Terms and Conditions.
- **Safety/Crisis Notice**: the public page that explains Seraya is not a crisis service and points the client to professional crisis support, in line with the safety boundary in PRD 03.

The placeholder is acceptable during development. The final copy requires clinical/ethics and legal review, as recorded in the acceptance checks.

## Acceptance checks

- The MVP does not store clinical notes, diagnosis, assessment results, transcripts, or treatment notes.
- Consent version is stored with the booking.
- Public notices (Informed Consent, Privacy Notice, Safety/Crisis Notice) are linked from the booking flow, the booking confirmation page, the FAQ, and the footer.
- The client can request a copy of their data and Admin can deliver it by email.
- The client can request correction or deletion, and Admin evaluates the request against the retention policy.
- Data access is logged: any time a privileged role reads or shares client data, the audit record includes actor, timestamp, booking reference, and the data categories accessed.
- A data breach is reported to affected clients by email.
- The informed consent text is versioned; the version shown at booking time is stored with the booking.
- The Privacy Notice, Informed Consent, and Safety/Crisis Notice are written in Bahasa Indonesia.
- All three notices have a place on the public site (footer or subpage navigation) and a clear statement of the last-updated date.

## Still open for this PRD

- Final text for the Informed Consent, Privacy Notice, and Safety/Crisis Notice, owned by the product owner with clinical/ethics and legal sign-off.
- Exact retention durations per data category beyond the 12-month minimum, owned by PRD 07.
- Storage, encryption, and access-control implementation, owned by PRD 07.
- Breach incident response procedure, owned by PRD 07.
- Audit log detail (what exactly is recorded per action), owned by PRD 07.
- If and when the guardian route is added for ages 16–17, this PRD must be updated and a new PRD may be required for the consent and identity verification flow.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/02-payment-flow.md`
- `docs/prd/05-cancellation-refund.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/adr/0083-client-contact-retention-12-months.md`
- `docs/adr/0086-audit-security-retention-policy.md`
- `docs/adr/0087-client-redaction-pseudonymization.md`

## Status

**Business review closed. Implementation intentionally deferred.**

The remaining items are final public copy, technical controls, retention configuration, and operational procedure follow-ups.

## Change log

- 2026-09-02: Initial data boundary and consent rules from Round 3.
- 2026-09-02: Recorded product-owner decisions: full profile, booking, and history data; client/Admin access with scoped psychologist sharing; client access/correction/deletion rights; email breach notification; no marketing; 18+ only; public copies remain placeholders until sign-off.
