# Seraya Psikologi — Domain Context

This context covers the booking-and-payment website MVP. It is deliberately separate from clinical records and professional session documentation.

## Boundary

The MVP is a marketing, psychologist-directory, availability, booking, payment, and content-management platform. It is not an EMR and does not store clinical notes, diagnoses, assessment results, or session records.

## Terms

### Appointment

The scheduled commitment for a service session between one client and one psychologist at a concrete start/end time in the canonical timezone. An Appointment represents the calendar reality, not the payment attempt.

Distinct from **Booking** (the client-facing request/process that may create it), **AvailabilitySlot** (capacity offered before it is claimed), and **Payment** (financial settlement).

### Booking

A client-facing request/process to obtain one or more Appointment instances. In MVP it may represent a single-session purchase or a multi-session package; package entitlement, expiry anchor, ordered scheduling, and purchase-instance boundaries are defined by the package ADRs, while exact refund/extension/transfer policy remains open.

Distinct from **Appointment** (one concrete scheduled session) and **Payment** (a transaction). Keep the concepts separate so a package can track remaining sessions without overloading the Appointment lifecycle.

### AvailabilitySlot

A unit of bookable capacity offered by a psychologist for a service and time range. It can be held temporarily and then claimed by an Appointment, or become available again after expiry/cancellation according to policy.

Distinct from **Appointment**: a slot is an offer/capacity; an appointment is the accepted schedule.

### Payment

A record of a financial attempt or settlement related to a Booking. Gateway status, internal status, idempotency key, and reconciliation data belong here rather than on Appointment.

Distinct from **Booking**: payment failure does not necessarily erase the client's intent; it changes whether the booking can proceed.

### ClinicalRecord (out of scope)

Professional session notes, diagnosis, assessment results, treatment details, and other clinical records. These are explicitly outside the booking-and-payment MVP and must not be smuggled into Booking, Appointment, or Client fields.

## Working relationship

`Client` requests a `Booking` for one `ServiceOffering` or bound `ServicePackage`; the Booking may create one single-session `Appointment` or a `PackagePurchase` with multiple entitlement-linked Appointments, and may have one or more Payment attempts/events. State transitions are defined in the lifecycle/payment ADRs; late-payment reconciliation, package unavailability, and exact exceptional refund policy are governed by ADR 0059/0060/0063.

### Client

The person who seeks or receives a Seraya service. A Client may create a Booking as a guest and therefore does not require a UserAccount in the MVP.

Distinct from **UserAccount** (authentication identity) and **PsychologistProfile** (the professional directory/scheduling identity).

### UserAccount

An authentication identity used to access client or staff capabilities. For clients it is optional in the MVP; privileged roles require authenticated accounts with explicit authorization.

Distinct from **Client**: one person may have a Client record without an account, and account-linking/deduplication needs an explicit policy.

### ClientAccess

A verified, limited mechanism for a guest client to view the relevant Booking/package and perform explicitly allowed actions—primarily scheduling a remaining entitlement—without creating a full account. The scope is the relevant Booking/package, not merely a package: email-delivered magic link/OTP is one-time for 15 minutes, followed by a scoped session for 30 minutes. Resend invalidates older tokens; cancellation/reschedule requests use WhatsApp/manual support; access never exposes a global Client record or other bookings.

Distinct from **UserAccount**: ClientAccess is scoped to a booking/package action, while UserAccount is a durable login identity.

### Service

A canonical public service category that explains what Seraya offers. It may define shared defaults such as display name, description, default duration, and default price, but it is not itself a concrete appointment slot.

Distinct from **ServiceOffering**: Service is the reusable catalog concept; ServiceOffering is the bookable variant for a psychologist.

### ServiceOffering

A bookable variant connecting one Service to one psychologist, with effective price/currency, duration, mode, transition buffer, eligibility inherited from Service/admin policy, and publication lifecycle `draft` → `published` → `archived`. Only published offerings generate new exposed slots; archiving preserves history and stops new bookings.

Distinct from **Service** (catalog category) and **Appointment** (a scheduled instance selected by a client).

### ServicePackage

A catalog configuration for a multi-session product: allowed ServiceOffering/psychologist binding, default session count, package price, validity calendar period/configuration, and policy references. It is editable/publishable catalog data and contains no purchased SessionEntitlement units.

Distinct from **PackagePurchase**: ServicePackage is the catalog template; PackagePurchase is the historical instance created by a Booking/payment.

### PackagePurchase

The historical purchased instance of a ServicePackage, owned by a Booking. It snapshots effective catalog identity/version, psychologist/ServiceOffering binding, price, session count, PackageValidity/expiry, and applicable policy references, and owns the resulting SessionEntitlement units. If the bound offering becomes unavailable, a separate audited PackageAvailabilityResolution is required; the binding is not silently rewritten.

Distinct from **ServicePackage** (mutable catalog) and **PackagePayment** (financial settlement for the purchase).

### PackageValidity

The visible, configurable calendar validity period for a PackagePurchase/its SessionEntitlement units. The period starts at verified PackagePayment success, uses Asia/Jakarta policy semantics, and computes an explicit expiry timestamp. After expiry, unused entitlements cannot be scheduled through the normal client flow; any exception must be explicit and audited.

Distinct from **SlotHold TTL**: PackageValidity governs purchased unused sessions over a long horizon, while SlotHold TTL governs a temporary payment reservation for one slot.

### NotificationChannel

MVP channel policy is resolved: email is automated; Admin may use WhatsApp manually as flexible support while the client has an active Booking/Appointment/package. No automated WhatsApp provider, required follow-up task, or acknowledgement gate is required. WhatsApp remains support/communication, not Payment/Booking/Appointment truth.

Distinct from **Notification**: Notification is the intent; NotificationChannel is the delivery policy/route.

### PrivacyRequest

A manually handled client request for access, correction, deletion, or restricted processing of transactional personal data. It records verified requester context, request type, scope, decision, retention/legal exception, redaction/anonymization result, and responsible admin without storing clinical notes.

### RetentionPolicy

A versioned policy for one transactional data category—such as Client contact, Booking/Appointment, Payment/Refund, ConsentRecord, Notification delivery, or Audit metadata. It defines retention/deletion/anonymization behavior and any documented legal/operational exception; exact durations remain policy-owned.

### ClientMergeAction

An audited admin operation to link/merge duplicate Client records after verification. It does not automatically expand existing ClientAccess scope; affected Booking/package links and identity history must remain traceable.

### CrisisNotice

Static, versioned public notice/referral content that explains the service is not an emergency/crisis response and directs a person to appropriate local emergency/support resources. It is not a triage result, diagnosis, or Client record.

Distinct from **CancellationRequest**: PrivacyRequest concerns data handling; CancellationRequest concerns Booking/Appointment/package operations.

### ContentEntry

A public-facing article, FAQ, service explanation, team/profile copy, or other CMS-managed content unit. In MVP it may move between draft, published, and archived; publication is allowed directly by the Editor role and must create a ContentRevision/audit record.

Distinct from transactional entities: ContentEntry must not contain client, payment, booking, or clinical records.

### ContentRevision

An immutable version/audit record for a ContentEntry, including author/editor, change time, status transition, and publish time where applicable. It supports rollback/attribution even when an editor can publish directly.

### ProfileFieldOwnership

The split between editorial profile copy and protected professional/operational facts. Editor may manage narrative/public copy; admin controls credentials, approved professional facts, ServiceOffering, and operational publication/locks. Psychologist may propose or edit their own allowed profile/availability fields according to RBAC; valid availability changes become directly effective for future slot generation under ADR 0058, while Admin retains override/lock/audit authority. No change may mutate confirmed transactional history in place.

### StaffMembership

An explicit allowlisted/invited association between an authenticated staff identity and one or more internal roles (`admin`, `editor`, `psychologist`). It is assigned/changed by an admin and audited; Google SSO authentication alone never grants a role.

### AssignedClientView

The minimum operational projection a Psychologist may see for Appointments/SessionEntitlements assigned to them: display name, offering, schedule, mode, and contact only when operationally necessary. It excludes unrelated bookings, full Client history, payment detail, full consent history, and PrivacyRequest operations.

### AvailabilityRule

A recurring schedule pattern owned by a psychologist, such as a weekly day/time window. It is a source rule, not itself a bookable slot.

### BookingHorizon

The rolling future window in which AvailabilitySlot instances may be generated and exposed for booking. MVP default is 90 days, configurable by Admin, using Asia/Jakarta operational time and excluding slots outside the horizon.

### TransitionBuffer

The non-bookable interval applied around a ServiceOffering's Appointment for slot generation and overlap/concurrency checks. MVP default is 15 minutes, configurable per offering; the effective value must be snapshotted for historical interpretation.

### OfferSnapshot

The immutable effective ServiceOffering values captured when a Booking/payment intent is created: price, currency, duration, transition buffer, mode, and relevant offering/policy version references. It is the quote used through SlotHold and copied into Payment, PackagePurchase, and Appointment records as applicable.

### ServiceOfferingRevision

An immutable published configuration revision for a ServiceOffering. It owns effective price/duration/mode/buffer and policy references used to generate future AvailabilitySlots. New revisions affect future availability; OfferSnapshots and historical appointments retain the revision they used.

Distinct from **AvailabilityException** (a date-specific change) and **AvailabilitySlot** (a concrete generated capacity).

### AvailabilityException

A date-specific override to a psychologist's recurring availability, such as leave, a holiday, a one-off added window, or a blocked period. For the same operational date/range, it overrides the applicable AvailabilityRule; ADR 0061 defines how resulting future slots are regenerated or withdrawn.

Distinct from **AvailabilityRule**: it changes one date or range without rewriting the recurring pattern. For matching dates/ranges it takes precedence over the rule; future-slot regeneration/withdrawal follows ADR 0061.

### AvailabilitySlot

A concrete generated unit of bookable capacity for one psychologist, one ServiceOffering, and one time range in the operational timezone. It can be held temporarily and then claimed by an Appointment.

Distinct from **AvailabilityRule**/**AvailabilityException** (schedule source inputs) and from **Appointment** (the confirmed scheduled commitment). A psychologist must not have overlapping active SlotHolds or Appointments, even across different ServiceOfferings.

### SlotHold

A temporary claim on an available AvailabilitySlot while a Booking waits for payment. It has an expiry and must be released when payment fails, expires, or the Booking is cancelled according to policy.

Distinct from **Appointment**: a SlotHold is provisional capacity; it does not represent a confirmed session.

### BookingData Boundary

The booking MVP may collect only the minimum data needed to identify the contact, deliver the transaction, notify the client, record required consent, and connect the Booking to its ServiceOffering, SlotHold, Appointment, and Payment.

A WhatsApp-capable phone/contact number is **optional**. When supplied, it is for optional Admin manual support while the client has an active Booking/Appointment/package. It is not required for Booking, confirmation, or any lifecycle state. An optional short message may be allowed only when explicitly labeled non-clinical and bounded by validation. Diagnosis, symptom narratives, assessment results, clinical notes, treatment details, and session records are not BookingData. Cancellation and refund requests are handled by Admin through WhatsApp; they are not part of the public website UI.

### PsychologistProfile

The public and operational profile for a psychologist, including approved professional information, service offerings, availability, and own appointments. In MVP, a psychologist may manage their own profile/availability/appointments within authorization boundaries.

Distinct from **UserAccount** (login identity) and **Client** (service recipient). A PsychologistProfile is not a clinical record.

### ConsentRecord

Immutable evidence that an actor accepted or withdrew a specific consent purpose against a specific policy/notice version at a time and through a source/channel. Required transactional/privacy consent and optional marketing consent are separate purposes.

Distinct from **Booking**: a Booking may require one or more ConsentRecords, but consent history must not be represented as one mutable boolean on the transaction.

### Notification

A transactional communication intent tied to a domain event or state change, such as payment confirmation, booking expiry, cancellation, or reminder. It records what should be delivered and to whom, without being a marketing campaign.

Distinct from **DeliveryAttempt** (a channel-specific send attempt/result) and **Booking** (the business transaction that may trigger it).

### AdminWhatsAppSupport

Optional manual human support by Admin while a client has an active Booking, Appointment, or PackagePurchase. Timing, frequency, assignment, and completion are operational discretion, not required lifecycle state. If contact metadata is retained, it must be minimal and non-clinical. It does not replace Notification, Payment, Booking, Appointment, CancellationDecision, or RefundAction truth.

Distinct from **ClientAccess**: ClientAccess authenticates scoped guest actions; AdminWhatsAppSupport is optional human support.

### DeliveryAttempt

A record of one Notification delivery attempt through a channel, including status, provider reference, retry information, and failure reason subject to redaction.

### ReminderSchedule

A transactional Notification schedule derived from an Appointment/PackagePurchase event, such as the default 24-hour and 2-hour Appointment reminders or a package expiry reminder. It contains no clinical detail and must be cancelled/recomputed when the underlying Appointment or validity changes.

Distinct from **Notification**: a Notification can have multiple DeliveryAttempts when retrying or using fallback channels.

### CancellationPolicy

The versioned global rule set that determines when a Booking/Appointment may be cancelled and whether a related Payment is eligible for refund. For launch, the public rule states only that cancellation and refund are handled by Admin via WhatsApp on a case-by-case basis. The applicable policy version is captured with the transaction.

Distinct from **Booking** and **Payment**: the policy explains the rule; the transaction records what actually happened and which policy version was applied.

### CancellationRequest

A request to cancel a Booking, Appointment, or package entitlement that enters an explicit internal review lifecycle. In MVP, a client raises the request through Admin WhatsApp and an admin records the minimum structured intake in the Admin Cancellation & Refund Workspace; the request does not itself change Appointment, SlotHold, entitlement, or Payment state. It is resolved through a separate append-only CancellationDecision and any RefundAction. The customer-facing interaction remains WhatsApp/manual; no self-service cancellation/refund UI is part of the public website or app under ADR 0065/0066/0067.

Distinct from **CancellationPolicy** (the rule) and **Booking/Appointment** (the affected transaction/schedule). A cancellation request must not contain clinical notes, and ClientAccess does not directly cancel the transaction.

### CancellationDecision

An append-only Admin decision recorded in the Admin Cancellation & Refund Workspace after a CancellationRequest review. It records **approve** or **deny** outcome, reason/category, applicable policy version, actor/time, Appointment/slot/entitlement effects, and linked RefundAction or `no_refund` reason. Approval is the authority for the atomic operational state change; for an eligible future slot, the same approval operation releases capacity. There is no separate `Release Slot` action in MVP; the original request and earlier decisions remain immutable. Partial monetary refund is not a decision outcome; tiered or admin-defined refund amounts are conversation-only and never drive the canonical state.

Distinct from **CancellationRequest** (intake) and **RefundAction** (financial action): a decision may release a future slot or restore an entitlement even when no refund is issued.

### AdminCancellationRefundWorkspace

An Admin-only CMS/backoffice capability for reviewing Booking/Appointment/PackagePurchase cancellation requests, recording CancellationDecision, releasing eligible future capacity, restoring valid package entitlement, and recording separate RefundAction. It is an internal execution surface, not a client self-service flow and not a clinical record system.

Distinct from **AdminWhatsAppSupport**: WhatsApp is the manual discussion channel; the workspace is the authoritative operational execution/audit surface.

### RescheduleAction

An audited administrative operation that preserves the original Appointment record, marks it `rescheduled`, and creates/links a replacement Appointment to a new AvailabilitySlot. For a package, the replacement references the same SessionEntitlement and PackagePurchase; it does not create a new Payment or consume another entitlement.

Distinct from mutating an Appointment's time in place: the original commitment and actor/reason remain traceable.

### OperationalTimezone

The canonical timezone used for Seraya availability rules, appointment interpretation, cutoff windows, and operational notifications: `Asia/Jakarta`.

Distinct from a visitor's browser timezone: client display preferences must not change the schedule source of truth.

### AppointmentOutcome

An operational post-session outcome recorded for a confirmed Appointment: `completed` or `no_show`, with actor/time and allowed operational metadata. Psychologist/admin may mark the initial outcome; later changes use an admin-only audited OutcomeCorrection event and never clinical notes, diagnosis, assessment results, or treatment details.

Distinct from a clinical record: outcome does not contain session notes, diagnosis, assessment results, or treatment details.

### SessionEntitlement

One usable session unit owned by a PackagePurchase. It has a `sequence_number`, starts available, may be reserved by at most one scheduled Appointment, and becomes consumed only from the Appointment outcome: `completed` or default `no_show`; an approved cancellation releases it if the package remains valid. Normal client scheduling uses the lowest sequence-numbered available/valid unit; terminal expired/closed units are skipped. An admin may override with an audited reason.

Distinct from **Appointment**: an entitlement is the right/remaining unit to schedule; an Appointment is the concrete time commitment. Distinct from **Payment**: payment settles the package purchase but does not itself consume each session unit.

### PackagePayment

The full-upfront Payment that settles a PackagePurchase created from a ServicePackage catalog version and creates its SessionEntitlement units. Later scheduling/consumption of those units does not create a new payment; any approved refund is recorded as a separate Refund/PaymentAction.

### RefundAction

An append-only financial action linked to a Payment and cancellation/policy decision. It records `full_refund` or `no_refund` outcome with currency, reason/category, actor/approval, gateway reference, status, idempotency key, and failure/retry metadata without rewriting the original Payment. For PackagePurchase, amount is an explicit Admin purchase-level decision; no per-entitlement allocation or equal-split calculation is assumed. It is created/managed through the Admin Cancellation & Refund Workspace after the decision; no client self-service refund action is exposed. Tiered partial refund is not a `RefundAction` outcome at launch; the `full_refund` corresponds to the captured amount.

Distinct from **SessionEntitlement**: PackagePayment is financial settlement; entitlements are the resulting usable units.

### EntitlementConsumption

The operational decision that moves a SessionEntitlement from usable/scheduled to consumed. `completed` consumes it; an approved `cancelled` Appointment does not consume it; an authorized psychologist/admin marking `no_show` consumes it by default, subject to an audited admin override.

Distinct from **AppointmentOutcome**: the outcome describes what happened to the appointment, while consumption determines the package unit balance.

### PaymentEvent

An inbound, verified or rejected gateway notification with provider event ID, received time, signature/verification outcome, processing status, and correlation to Payment. It supports deduplication, retry, reconciliation, and audit without treating the browser redirect as authority.

Distinct from **Payment**: Payment is internal financial state; PaymentEvent is an external event observation.
