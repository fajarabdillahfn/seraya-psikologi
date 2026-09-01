# Seraya Psikologi — Technical Domain Model

> Generated from the live technical PRD at revision 168. The ADR set in `docs/adr/` is the decision history; this file is a review-friendly synchronized summary.

# Launch scope

Launch scope: marketing, public program architecture, psychologist directory, SERAYA PULANG counseling catalog, online/offline availability, guest booking, **WhatsApp manual payment (PDF + plain text invoice, Admin mark-as-paid per `ADR 0097`)**, packages, email notifications, and Admin CMS. Midtrans and other payment gateways are **deferred post-MVP** (`ADR 0068` superseded).
Only SERAYA PULANG is bookable/paid. Other program pillars are public content without booking/payment in launch. Psychological assessment, Editor role, extra payment methods, partial refunds, and client self-service cancellation/refund are deferred.

# Domain and catalog

MVP boundary: public marketing/program architecture, psychologist directory, CMS, scheduling, booking, payment, and operational support for psychology services. Clinical records are explicitly out of scope.

Launch program scope:
- SERAYA PULANG, SERAYA BERDAYA, SERAYA BERSAMA, and SERAYA BERBAGI are public program pillars.
- Only SERAYA PULANG is bookable/paid in launch.
- SERAYA PULANG launches psychological counseling; psychological assessment is deferred.
- Counseling is bookable online and offline, 60 minutes per session.

Launch catalog:
- Individual counseling: online Rp125.000 single, Rp235.000/2 sessions, Rp345.000/3 sessions; offline Rp200.000 single, Rp380.000/2 sessions, Rp555.000/3 sessions.
- Couple counseling: 3 meetings with explicit A/B/joint sequence; online Rp350.000, offline Rp550.000.
- Packages are paid upfront in IDR. Catalog revisions are snapshotted; changing a future offering never mutates a purchased package.
- Fuja Rahayu Kinanti is the only confirmed launch psychologist and is assigned to individual and couple counseling. Her recurring availability is `anytime/anyplace` for PRD/prototype only; production slots require a later operational schedule/location entry.

Actors and identity:
- Client may book as a guest; optional UserAccount/Google linking is separate.
- Staff access requires Google SSO plus Admin invite/allowlist and explicit StaffMembership/RoleAssignment.
- Active staff roles are Admin and Psychologist. Editor is defined as future-capable but deferred/unassigned at launch.
- ClientAccess is Booking/PackagePurchase-scoped email magic link/OTP: one-time token 15 minutes, scoped session 30 minutes, resend invalidates older tokens.

Core entities:
- PsychologistProfile, Service, ServiceOffering, immutable ServiceOfferingRevision, ServicePackage, AvailabilityRule, AvailabilityException, AvailabilitySlot, SlotHold, Booking, BookingParticipant, OfferSnapshot, Appointment, AppointmentParticipant, PackagePurchase, SessionEntitlement, Payment, PaymentEvent, **PaymentProof (per `ADR 0097`)**, RefundAction, ConsentRecord, CancellationRequest, CancellationDecision, RescheduleAction, AppointmentOutcome, OutcomeCorrection, ReminderSchedule, Notification, DeliveryAttempt, PrivacyRequest, ClientMergeAction, StaffMembership, ContentEntry, ContentRevision, and AuditRecord.
- ServiceOffering is the concrete bookable variant for one psychologist; published revisions drive future slots and new snapshots.
- ServicePackage is a catalog template; PackagePurchase owns the purchased ordered entitlements after verified full payment.
- `BookingParticipant` is a child of `Booking` and records one human party to a couple Booking with `party_role` ∈ {`participant_a`, `participant_b`} and `is_payer` flag. Exactly two participant rows exist for a couple Booking; exactly one carries `is_payer = true`. Field minimum: `display_name`, `contact_email` (verified, for ClientAccess), `contact_phone` (optional, for Admin WhatsApp support), `age_at_booking` (snapshot), `relationship_to_other` (snapshot, not mutated), and `consent_record_id` linking to `ConsentRecord`. Authority: `ADR 0090`.
- `AppointmentParticipant` is a child of `Appointment` and records which `BookingParticipant` is bound to which concrete Appointment. For appointment A: one row with `attendance_mode = individual_a`; for B: one row with `individual_b`; for joint: two rows with `joint_both` (one per partner). `presence_status` ∈ {`expected`, `present`, `absent`, `withdrawn_pre_session`, `withdrawn_mid_session`}. Authority: `ADR 0090`.

Domain boundaries:
- Payment truth is a verified `payment_proof` record (per `ADR 0097`) signed/verified by Admin action in the Admin workspace (Mark-as-Paid), not a browser redirect or provider event. Midtrans signed-server-verified provider events are the launch-deferred alternative path (`ADR 0068` superseded).
- CancellationDecision is append-only approve/deny; pending preserves confirmed Appointment and reservation; approval atomically cancels, releases eligible future capacity, and restores valid entitlement; pending-vs-outcome race is resolved deterministically per `ADR 0095 §2` (R1/R2 auto-resolve, R3 blocks late outcome marking, R4 rebinds to reschedule replacement); repeat/correction creates a new decision with `correction_of` linkage while the original remains immutable history (`ADR 0095 §4`); package-wide cancellation closes `PackagePurchase` atomically with no re-open (`ADR 0095 §3.2`).
- RefundAction is separate and launch-limited to full_refund or no_refund. Partial monetary refunds are deferred; tiered or admin-defined amounts live in the Admin WhatsApp conversation log, not in the booking product.
- Email is the automated channel. Admin WhatsApp is the only public-facing channel for cancellation/refund requests; it is not a lifecycle gate, fallback authority, task, SLA, acknowledgement gate, or source of truth.
- No clinical notes, diagnosis, assessment results, session notes, crisis intake/triage, or crisis narrative are stored in MVP.

# Actors and authentication

Staff use Google SSO only after Admin invite/allowlist and explicit active StaffMembership/RoleAssignment for `admin` or `psychologist`. Google authentication, email-domain matching, self-signup, or self-selected role never grants staff access. Two Admin memberships are bootstrapped; either may invite/revoke staff. No shared account, password fallback, or undocumented bypass. Editor is not active at launch.

Guest ClientAccess uses email-primary one-time magic link/OTP (15-minute token, 30-minute scoped session); resend invalidates older tokens and plaintext tokens are never stored/logged. Optional Google/UserAccount linking is not required. ClientAccess is scoped to verified Booking/PackagePurchase and cannot perform self-service cancellation/refund or enumerate other records.

Active roles: visitor, client, psychologist, admin

# Relations

Client → Booking → OfferSnapshot + SlotHold → Payment/PaymentEvent → Appointment or PackagePurchase.
Service → ServiceOffering → ServiceOfferingRevision → future AvailabilitySlot. PackagePurchase → ordered SessionEntitlement → Appointment.
CancellationRequest → append-only CancellationDecision → atomic Appointment/slot/entitlement effect → optional separate RefundAction.
RescheduleAction links original Appointment to replacement while preserving Booking/payment/package/entitlement. ConsentRecord, PrivacyRequest, StaffMembership, ContentRevision, Notification, and privileged actions are audited.
Couple Booking (couple package per `ADR 0074` and `ADR 0090`) binds exactly two `BookingParticipant` rows (`participant_a`, `participant_b`), one with `is_payer = true`. Each `Appointment` links 1–2 `AppointmentParticipant` rows referencing the corresponding `BookingParticipant`. `BookingParticipant.consent_record_id` references an immutable `ConsentRecord`. `SessionEntitlement` is owned by `PackagePurchase` (not by participant); joint session cancellation may restore the joint entitlement through an explicit CancellationDecision. Refund is purchase-level decision (`ADR 0063`); per-participant refund allocation is never assumed.

# Lifecycle

Single session: select published counseling offering/mode/slot → Booking + snapshot + hold → invoice generated (PDF + plain text) → client receives via WhatsApp → client pays manually (bank transfer / VA / QRIS) → client sends payment proof to Admin WhatsApp → Admin Mark-as-Paid in workspace (`ADR 0097 MarkAsPaid` command) → `payment_proof` verified → `Booking.status = 'confirmed'` → `Appointment` confirmed.
Package: select package/first slot → full upfront payment → PackagePurchase + ordered entitlements + first Appointment; later valid units are scheduled sequentially; completed/no_show consumes; approved valid cancellation restores original sequence/expiry.
Cancellation: manual support → Admin CancellationRequest (at most one open per target) → pending preserves state → outcome race resolution (R1/R2 auto-resolve on completed/no_show, R3 blocks late outcome marking, R4 rebinds to reschedule replacement) → approve/deny → approval atomically cancels/releases/restores per target matrix (target = appointment / booking / package_purchase); separate full_refund/no_refund action. WhatsApp discussion is not domain truth. Canonical transition matrix for Booking, Appointment, PackagePurchase, and SessionEntitlement is in `ADR 0095-package-cancellation-matrix.md` §3 (per-target atomic effects), §4 (repeat/correction), §5 (RescheduleAction), and §6 (couple-package rules via BookingParticipant).
Couple package (`ADR 0090`): checkout records partner A as payer and creates `BookingParticipant` rows for A and B; magic-link verifies partner B independently; first Appointment A scheduled with `AppointmentParticipant(individual_a)`; appointment B with `individual_b`; joint session with two `AppointmentParticipant(joint_both)` rows after `joint_session_consent` verified for both partners. Withdrawal/no-show follows `ADR 0027`; joint session cancellation before start may restore entitlement #3 through explicit CancellationDecision. Refund remains purchase-level decision (`ADR 0063`/`0077`).

## Appointment outcome transition matrix (`ADR 0092`)

`Appointment` (mode individual atau couple-joint) mengikuti state machine ini. Outcome enum final: `completed` | `completed_partial` | `no_show` | `no_show_late` | `cancelled`. Hanya `cancelled` yang tidak mengonsumsi entitlement.

| From | Event | Precondition | To | Entitlement effect | Actor | Notification |
|---|---|---|---|---|---|---|
| `confirmed` | system auto T+15m, `client_arrived_at IS NULL` | scheduled_start + 15m lewat | `no_show` | consumed (locked) | system | email `no_show_recorded` + admin alert |
| `confirmed` | `RecordClientArrived` ≤ T+15m | server timestamp valid | `in_progress` | (none yet) | psikolog/Admin | admin in-app `client_arrived_admin` |
| `confirmed` | `RecordClientArrived` > T+15m | server timestamp valid | `in_progress` (info: `no_show` checkpoint sudah locked) | (none yet) | psikolog/Admin | admin in-app `client_arrived_admin` |
| `confirmed` / `in_progress` | CancellationDecision approve | `ADR 0051` satisfied | `cancelled` | restored jika entitlement valid | admin via CancellationDecision | sesuai cancellation flow |
| `in_progress` | `MarkAppointmentOutcome` end-of-session, attended ≥60m | `session_ended_at` dicatat, `effective_attended_minutes ≥ 60` | `completed` | consumed | psikolog assigned / Admin override | email `outcome_finalized` |
| `in_progress` | `MarkAppointmentOutcome` end-of-session, attended 1–59m | `effective_attended_minutes` dalam [1, 59] | `completed_partial` | consumed + compensation token eligibility flag | psikolog assigned / Admin override | email `outcome_finalized` |
| `in_progress` (after late arrival) | `MarkAppointmentOutcome`, attended ≥1m, `client_arrived_at > T+15m` | checkpoint `no_show` sudah locked | `no_show_late` | consumed (tetap; checkpoint sudah lock) | psikolog assigned / Admin override | email `outcome_finalized` |
| `no_show` / `completed*` / `no_show_late` | `CorrectAppointmentOutcome` dalam window 7 hari kalender | `now ≤ marked_at + 7×24h` | (outcome baru sesuai koreksi) | delta ±1 sesuai arah koreksi | admin only | email `outcome_corrected` |

`SessionEntitlement.status` transisi:

```
available → scheduled → consumed         # completed / completed_partial / no_show / no_show_late
available → scheduled → available        # cancelled approved (restore jika valid)
consumed → available                     # OutcomeCorrection yang me-restore entitlement dalam window 7 hari
```

Correction window: **7×24 jam (7 hari kalender)** Asia/Jakarta dari `marked_at`. Lewat window, `OutcomeCorrection` ditolak dengan error `correction_window_expired`; perubahan hanya via `CancellationDecision` baru atau explicit Admin extension/exception (di luar scope, `TBC-EXTENSION-01`).

## Cancellation transition matrix (`ADR 0095`)

Target types: `appointment`, `booking` (single-session single-Appointment), `package_purchase`. At-most-one open `CancellationRequest` per target (unique partial index). Pending preserves state per `ADR 0025`; no pre-decision slot release. Approval atomic in one DB transaction per `ADR 0089` D1 batch semantics.

| From | Event | To | Atomic effects | Actor |
|---|---|---|---|---|
| `CancellationRequest.state = open` (target = appointment / booking) | `completed` lands first (R1) | `CancellationRequest → auto_resolved`; Appointment stays `completed` | none; consumed per `ADR 0027`/`ADR 0092` | system |
| `CancellationRequest.state = open` (target = appointment / booking) | `no_show` lands first (R2) | `CancellationRequest → auto_resolved`; Appointment stays `no_show` | none; consumed per `ADR 0027` | system |
| `CancellationRequest.state = open` (target = appointment / booking) | RescheduleAction (R4) | `CancellationRequest.target_appointment_id` rebinds to replacement; original Appointment → `rescheduled` | replacement inherits request | admin / psychologist |
| `CancellationRequest.state = open` (any target) | DecideCancellation approve | `CancellationRequest → approved`; target-specific atomic effects (see §3.1–§3.2 in `ADR 0095`) | per target matrix | admin |
| `CancellationRequest.state = open` (any target) | DecideCancellation deny | `CancellationRequest → denied` | none | admin |
| `CancellationRequest.state = approved/denied` | new RequestCancellation on same target | new `CancellationRequest` opens with `correction_of`; old decision marked `superseded_by` | depends on new decision; original immutable | admin |
| `CancellationRequest.state = approved` (target = package_purchase) | atomic transaction | `PackagePurchase.state → closed_by_cancellation` (terminal); all future non-terminal Appointments → `cancelled`; their `CapacityReservation` → `cancelled`; unused `SessionEntitlement` with `valid_until >= now` → `closed_restored_by_cancellation`; other unused → `closed_cancelled_with_package`; consumed/expired untouched; `PackageValidity.valid_until` unchanged; no re-open | full sweep atomic | admin |
| `CancellationRequest.state = approved` (target = appointment / booking) | atomic transaction | Appointment → `cancelled`; `CapacityReservation` → `cancelled` (`release_reason = appointment_cancelled`); linked `SessionEntitlement` → restored if `valid_until >= now`, else `closed_*`; eligible future slot → `available` | atomic single-target | admin |
| `Appointment.state ∈ {cancelled, rescheduled}` | late outcome marking attempt | rejected | `E-APPOINTMENT-ALREADY-CANCELLED` | (reject) |
| `Appointment.state ∈ {completed, completed_partial, no_show, no_show_late, cancelled, rescheduled}` | RescheduleAction attempt | rejected | per `ADR 0095 §5.1` typed failure | (reject) |
| `PackagePurchase.state = closed_by_cancellation` | any state change attempt | rejected | `E-PACKAGE-CLOSED-BY-CANCELLATION`; recovery = new PackagePurchase + new payment | (reject) |

`SessionEntitlement.status` extended values per `ADR 0095`: `closed_restored_by_cancellation`, `closed_cancelled_with_package`. `RescheduleAction` forbidden transitions enumerated in `ADR 0095 §5.1`; couple-package rules in `ADR 0095 §6` (joint pre-start cancellation restores entitlement #3; mid-session withdrawal is **not** a cancellation path and lives in `OutcomeCorrection`/`AppointmentOutcome`).

# Booking and availability

Single-session: pending_payment with active SlotHold → confirmed only after verified PaymentEvent → completed/no_show/cancelled/rescheduled through explicit actions. Hold/payment failure → expired/failed. Package Booking additionally creates PackagePurchase and ordered entitlement states available/scheduled/consumed/expired/closed.
Cancellation policy has no automatic cutoff. Admin records and reviews requests case-by-case. Pending preserves confirmed Appointment and slot reservation. `CancellationDecision` is approve/deny; approval atomically cancels Appointment, releases an eligible future slot, and restores a valid entitlement; ineligible/past/withdrawn capacity remains recorded but unavailable. No separate Release Slot command exists. Historical Appointment is retained. Reschedule preserves original Appointment as rescheduled and creates a replacement.

AvailabilityRule/Exception changes affect only future unheld/unbooked slots. Held/booked/historical records are preserved; invalid future unheld slots are withdrawn, not silently migrated. Booking horizon is rolling 90 days, timezone Asia/Jakarta, TransitionBuffer 15 minutes, SlotHold TTL 10 minutes. Psychologist may manage own future inputs; Admin may override/lock/audit.
Design placeholder: Fuja recurring availability is `anytime/anyplace` and is non-blocking for PRD/design. No production slot is inferred from it; real schedule/location must be entered before live slot publication.

# Couple package participant model (`ADR 0090`)

The couple package is a single Booking that purchases three Sessions (A, B, joint) for two partners. The model uses `BookingParticipant` and `AppointmentParticipant` as child entities, and reserves three party roles: `participant_a`, `participant_b`, and `payer` (label, currently always one of A or B; MVP default `participant_a`). The relational label `joint_attendees` is not a role but a derived attendance pattern on the joint Appointment.

Consent is per participant. A couple Booking creates at least three `ConsentRecord` instances:

1. `couple_consent` (payer-accepted at checkout, covers package-level purpose/confidentiality/data/limits);
2. `participant_consent_a` / `participant_consent_b` (per-partner individual consent, verified independently via email magic link — partner B does not wait on partner A);
3. `joint_session_consent` (explicit two-party consent before the joint Appointment is confirmed, with wording that names the joint attendance, the administrative-only scope of any retained record, and the right to withdraw without affecting completed individual Sessions).

Visibility is restricted: a partner sees only their own individual Appointment schedule and the joint Appointment schedule, plus the partner's display name for joint preparation. A partner does not see the other partner's contact details, individual-Appointment outcome, or ConsentRecord content. Admin sees the full `BookingParticipant` and `AppointmentParticipant` set for the Booking. Psychologist sees display names for assigned Appointments but does not see contact details outside operational necessity (`AssignedClientView`).

Withdrawal/no-show semantics:

- One partner absent on their individual Appointment → that Appointment becomes `no_show`; the corresponding entitlement unit (#1 or #2) is consumed per `ADR 0027`; the joint Session entitlement (#3) is not yet affected and the package can continue.
- One partner withdraws from the joint Session before start → joint Appointment is cancelled via `CancellationDecision`; entitlement #3 may be restored by Admin while the package remains valid; the other partner is notified but no penalty is applied to them.
- Both partners absent on the joint Session → joint Appointment becomes `no_show`; entitlement #3 is consumed.
- One partner withdraws mid-session → psychologist marks `completed` and records `withdrawn_mid_session` on the withdrawing partner's `AppointmentParticipant.presence_status`; entitlement #3 is consumed (session was held).

Reschedule authority is Admin or Psychologist only; clients/partners cannot self-reschedule couple Appointments (`ADR 0090`).

ClientAccess for couples is per-participant: each partner receives a `couple_access` token scoped to their own `BookingParticipant` and to Appointments in which they appear. There is no shared partner token and no cross-participant enumeration. The payer additionally receives a `couple_billing_access` scope (read-only) over the Booking's Payment/Refund records. `PrivacyRequest` from one partner processes only that partner's data; it does not delete the other partner or the joint Appointment. `TBC-COUPLE-01` (participant model) is closed by `ADR 0090`; `TBC-COUPLE-LAUNCH-01` (day-one bookable vs deferred) and `TBC-CONSENT-01` (final joint wording) remain open and gate live couple booking.

# Payment and refund

Launch gateway-of-record: Midtrans with Snap hosted checkout behind a provider-neutral PaymentGatewayAdapter. Browser redirect is informational; only signed, server-verified provider notification/webhook becomes PaymentEvent authority. Launch payment categories are QRIS and bank transfer/Virtual Account only. E-wallet, card, OTC, BNPL, direct debit, and other methods are deferred. Merchant onboarding, exact method codes, fees, limits, refund coverage, webhook payloads, and sandbox evidence remain pre-production verification items. Second gateway/failover is deferred.

Create Booking + OfferSnapshot + 10-minute SlotHold → create Midtrans Snap intent from snapshot amount → client completes hosted checkout → verify signed provider notification/webhook idempotently → settle Payment. Single-session success confirms Appointment; package success creates PackagePurchase + ordered SessionEntitlement and confirms first Appointment. Browser redirect never settles Payment. RefundAction is separate from Payment settlement and cancellation effects.
Late verified success after hold expiry becomes paid_late/reconciliation-required; reacquire only the original slot atomically if free. If unavailable, create no Appointment or alternate slot automatically; Admin resolves explicitly.

## Settlement uniqueness (ADR 0093)

For each `Booking.id` (and therefore each purchase intent), at most one `Payment` row is allowed to transition to `status = 'paid'` with `settled_at IS NOT NULL`. The invariant is enforced by a unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` plus an application-level precheck inside the webhook handler transaction (defense-in-depth, following the same pattern as `ADR 0091` capacity overlap detection). Duplicate `PaymentEvent`s with distinct `provider_event_id` for the same `order_id` are absorbed by the idempotency record: the first event applies the state transition, subsequent events insert new `PaymentEvent` rows but perform a no-op transition and never insert a second `Payment`.

Verified `PaymentEvent` requires value match, not just signature. `gross_amount`, `currency`, `order_id` (must equal `Booking.id`), and `merchant_id` (must equal configured Midtrans merchant) must match `OfferSnapshot` and `Booking.snapshotted_amount`. Mismatch is logged to `payment_event_mismatch_log` and the transaction is rolled back; no state transition occurs and Midtrans is contacted for investigation.

Idempotency keys (`payment_event_idempotency` keyed by `(provider_event_id, payment_intent_id)`) are lifetime-scoped — no TTL — with a `payload_hash = sha256(canonical_json(payload))` fingerprint. Same key + same hash returns the existing event result; same key + different hash raises `idempotency_key_collision` and rolls back (no silent overwrite); different key + same payload is treated as a separate duplicate event with a no-op transition.

Out-of-order and repeated-status mapping (full table in `ADR 0093 §4.1`): `capture`/`settlement` final → state transition; `pending` → no-op; `deny`/`cancel`/`expire`/`failure` → `Payment.status = 'failed'`; `refund`/`chargeback` → no-op on `Payment` (handled via `RefundAction`); `challenge` → admin review, no state change. `Payment.status` is a derived current projection and is never rewritten in place to represent historical changes.

Crash window is split into three layers (see `ADR 0093 §1.2` and `IMPLEMENTATION-GUIDE.md §7.3`): (a) between provider API call and persistence — optimistic `Payment` insert + idempotency record in one transaction; (b) between verified webhook and state transition — webhook handler transaction wraps idempotency, `PaymentEvent`, value match, state transition, and outbox; (c) between transition and outbox delivery — transactional outbox pattern (`application_outbox`) with best-effort retry and dead-letter routing. Verified event + state transition + outbox must commit atomically.

## `paid_late` package creation (ADR 0093 §5)

For late verified success (hold expired before webhook), `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` are created at the moment the webhook is verified, not deferred. Two outcomes are possible:

- **Slot reacquire succeeds** (atomic `CapacityReservation` claim per `ADR 0091`): `Payment.status = 'paid_late_slot_reacquired'`; `Booking.status = 'paid_late_slot_reacquired'`; `PackagePurchase.status = 'paid'`; `SessionEntitlement #1.state = 'scheduled'` linked to the reacquired Appointment; `SessionEntitlement #2..N.state = 'available'`; `PackageValidity.validity_start = now()`.
- **Slot reacquire fails** (overlap or slot unavailable): `Payment.status = 'paid_late_first_session_pending'`; `Booking.status = 'paid_late_slot_unavailable'`; `PackagePurchase.status = 'paid_late'` with `requires_first_session_scheduling = true`; `SessionEntitlement #1.state = 'pending_schedule'`; `SessionEntitlement #2..N.state = 'available'`; `PackageValidity.validity_start = now()`. Admin resolves via the existing reconciliation flow (`ADR 0067`): schedule an alternative slot for entitlement #1, execute `full_refund` (which closes the package and cancels remaining entitlements), or hold for client decision via WhatsApp.

The original `Booking.snapshotted_slot_id` is preserved for audit even when reacquire fails. `requires_first_session_scheduling` flags the package for Admin attention and is cleared once Admin resolves. No automatic refund or silent slot substitution occurs (consistent with `ADR 0059` and `ADR 0076` no-auto-cutoff).

Payment is the append-only original transaction correlated with verified PaymentEvent records. Browser redirect never confirms it. States distinguish paid_late/reconciliation-required from failed. Refund financial status is summarized from append-only RefundAction records without overwriting Payment history. Launch RefundAction is full_refund for captured amount or no_refund as an audited non-disbursement outcome; partial monetary refund is deferred and never derived from entitlement count.

Every refund outcome is an idempotent append-only RefundAction linked to original Payment and approved CancellationDecision or explicit Admin policy exception. Launch supports `full_refund` or `no_refund` only; partial monetary refunds are deferred. Record reason, policy/version, actor, approval, currency/amount where applicable, provider reference/status redacted, and reconciliation result. Full refund cannot exceed captured amount. One Admin may approve cancellation and execute the separate refund action; no second approval or threshold exists in MVP. Refund failure does not rewrite Payment or CancellationDecision and is handled through retry/reconciliation.

# CMS and authorization

Admin CMS launch surfaces: public program/content management; psychologist profile and protected credential verification status; ServiceOffering/Package revisions; future availability; Booking/Appointment; Payment/PaymentEvent/RefundAction; CancellationRequest/Decision; reschedule/outcome correction; PrivacyRequest; StaffMembership; audit.
Admin Cancellation & Refund Workspace: manual support context → request → pending → approve/deny → atomic cancellation/capacity/entitlement effect → separate full_refund/no_refund action. No separate Release Slot button, client self-service cancellation/refund, full chat transcript, or required WhatsApp task.

Active staff launch roles:
- Admin: catalog/revisions, availability overrides, Booking/Appointment, package, payment/refund, cancellation/reschedule/outcome correction, privacy, StaffMembership, policy, and audit actions.
- Psychologist: own profile/availability inputs, assigned Appointment/SessionEntitlement actions, minimum operational client projection, and initial completed/no_show mark. No payment/refund, cancellation approval, identity merge, clinical record, or PrivacyRequest access.
- Editor: future-capable ContentEntry/ContentRevision role, explicitly deferred/unassigned at launch; Admin publishes narrative content.
- Client/guest: scoped ClientAccess only; no direct cancellation/refund or access to other records. SSO alone never grants a role.

# Privacy, consent, and retention

Collect minimum transactional data with versioned ConsentRecord and purpose limitation. No clinical records, notes, diagnosis, assessment results, treatment details, crisis narratives, or automated triage.
Joint sign-off: clinical/ethical consent wording, crisis boundary, and professional/service claims by clinical lead; data inventory, access, retention implementation, redaction/anonymization, and security controls by technical owner. Cross-cutting changes require both. PrivacyRequest is identity-verified and category-aware.

Allowed: minimal Client/contact identity, verified email/phone, selected offering/package, price/duration/mode snapshots, slot/Appointment times, package/entitlement state, Payment/Refund references, ConsentRecord, Notification delivery metadata, audit/security metadata, and bounded non-clinical support metadata. No clinical notes/results/diagnosis/crisis narrative/raw WhatsApp transcript.
Retention categories are separate: Client/contact, Booking/Appointment, Payment/Refund, ConsentRecord, Notification/DeliveryAttempt, Audit/security.

Versioned, category-specific RetentionPolicy with purpose, trigger, duration, action, exception, and owner.
- Client/contact and optional WhatsApp contact: 12 months after last active service.
- Payment/PaymentEvent/RefundAction: applicable audit/legal policy; exact duration is policy-owner controlled.
- ConsentRecord: while related service/data records are retained plus applicable policy/legal requirement.
- Audit/security metadata: applicable audit/legal policy.
After Client/contact eligibility: redact direct identifiers/contact fields, preserve a non-reversible pseudonymous reference only when minimum transactional/audit integrity requires it, and record the outcome. No clinical data category is introduced. For couple Booking, redaction applies per `BookingParticipant`: one partner's retention clock does not automatically redact the other partner; the joint Appointment is preserved as a pseudonymous record referencing both pseudonymous participants.

# Notifications and support

Automated email is the primary channel for payment/Booking state, Appointment confirmation, schedule change/reschedule/cancellation decision, and default reminders at 24h/2h in Asia/Jakarta. Delivery failure never rolls back domain truth. Package expiry/remaining-session reminders require future offsets. Admin WhatsApp is the public-facing channel for cancellation/refund requests on a case-by-case basis; no automated provider, required trigger/task/SLA/frequency, acknowledgement gate, or lifecycle mutation. The public website does not host a cancellation or refund UI.

# Invariants and tests

Server-side invariants: no overlapping active SlotHold/Appointment for one psychologist including TransitionBuffer; one active hold per slot; one entitlement per active scheduled Appointment; sequential package scheduling cannot skip valid units without Admin override; verified payment/refund/webhook events are idempotent; CancellationDecision/RescheduleAction/OutcomeCorrection are versioned and atomic; duplicate retries cannot double-confirm, release, consume, restore, or refund.
Late payment reacquisition uses the same atomic slot/psychologist overlap invariant as normal booking. A race with another hold/Appointment produces paid_late without an automatic alternate Appointment.
Regeneration must lock/classify slot state before update: unheld/unbooked may withdraw/update, active SlotHold is preserved, Appointment-linked slot is immutable history. Late payment handles a preserved hold through ADR 0059.
Restoration/re-consumption/extension is idempotent and atomic with CancellationDecision or OutcomeCorrection; expired entitlement cannot be scheduled without an explicit extension state.
Cancellation approval is atomic/idempotent across Appointment, slot availability, entitlement restoration, and decision record. A slot is re-exposed only if future, valid, not held/booked by another transaction, and compatible with active offering/revision; otherwise the cancellation remains recorded without re-exposing capacity.
No pre-decision or separate post-decision slot release command exists in MVP; the approval command owns cancellation, eligible release, and valid entitlement restoration atomically/idempotently.

Launch-critical tests: program scope (only SERAYA PULANG bookable); catalog/mode/price/package snapshots; guest booking + 10-minute hold; Midtrans Snap QRIS/VA verified webhook authority; failed/late payment; sequential package entitlement; cancellation pending/approve/deny atomic effects; separate full_refund/no_refund; Google SSO + StaffMembership/RBAC; no clinical data; retention redaction; email reminders; mobile accessibility; retry/idempotency; audit completeness.

Unit/domain invariants; PaymentGatewayAdapter/webhook contract tests; Midtrans sandbox integration; permission/security tests; browser/mobile UAT; privacy/retention/redaction checks; failure/retry/idempotency tests; revision-conflict tests for PRD infrastructure.

# UAT and release gate

UAT for handoff/launch:
1. All four public programs render; only SERAYA PULANG offers booking/payment.
2. Counseling catalog shows online/offline 60-minute single/package/couple prices and full-upfront package behavior.
3. Guest booking creates OfferSnapshot + 10-minute SlotHold; snapshot is stable.
4. Midtrans Snap shows only QRIS and bank transfer/VA; redirect alone does not confirm; verified webhook confirms idempotently.
5. Hold/payment failure and late payment produce correct release/paid_late/reconciliation behavior with no alternate auto-assignment.
6. Package purchase creates ordered entitlements; completion/no_show consumes; valid approved cancellation restores sequence/expiry.
7. Cancellation pending retains reservation; approve/deny is audited; approval atomically cancels/releases/restores; RefundAction is separate full_refund/no_refund.
8. Google SSO requires invite/allowlist + StaffMembership; two Admin bootstrap; Psychologist scope works; Editor is denied/deferred.
9. No clinical data is stored; consent version, retention, redaction, and pseudonymous-link behavior are verifiable.
10. Email confirmation/reminders, mobile keyboard/focus/contrast/error states, retries/idempotency, and audit records pass.

PRD/design handoff acceptance:
- Core domain boundaries/lifecycles and ADR decisions are recorded.
- Launch program/catalog, prices/modes/packages, one confirmed psychologist, active roles, gateway/method scope, cancellation/refund vocabulary, privacy ownership/retention strategy, and anonymization outcome are explicit.
- Placeholders and remaining operational verification items are labeled: Midtrans merchant/sandbox evidence and exact activated method capability; production schedule/location replacing placeholder; credential/publication verification; policy-controlled durations; notification provider; recovery/runbooks.
- No clinical-record workflow, non-Pulang booking/payment, client self-service cancellation/refund, partial refund, or Editor launch access is hidden in MVP.
PRD/design handoff may proceed with explicit placeholders. Production launch requires UAT pass plus operational verification evidence and release sign-off.

PRD/design handoff may proceed with explicit placeholders. Production release requires UAT pass, Midtrans merchant/sandbox and method/refund verification, two Admin memberships, verified psychologist/publication data, production schedule/location replacing `anytime/anyplace`, approved Consent/RetentionPolicy values, notification/payment failure runbooks, and owner release sign-off.

# Non-goals

No clinical record/EMR, diagnosis, assessment results, treatment/session notes, crisis intake/triage/risk scoring/escalation case management, client self-service cancellation/reschedule/refund, marketing automation, automatic identity dedupe, package installments, or automatic multi-psychologist transfer.
No multi-gateway launch/failover, extra payment methods beyond QRIS/VA, partial monetary refund, per-entitlement price ledger/equal-split refund, Editor launch access, or production slots inferred from placeholder availability.
No hard-delete cascade that destroys Payment/Refund/Audit integrity; no silent slot migration, package binding rewrite, automatic validity reset, or automatic alternate-slot assignment after late payment.
No automated WhatsApp provider/lifecycle, required WhatsApp task/SLA/frequency, acknowledgement gate, fallback authority, or cancellation caused solely by unanswered WhatsApp. Optional Admin WhatsApp is manual support only.

# Decision log

Confirmed launch decisions:
- Four program pillars are public; only SERAYA PULANG is bookable/paid.
- SERAYA PULANG launches counseling first; assessment is deferred.
- Counseling is online/offline, 60 minutes.
- Individual/couple catalog prices and package sequence are recorded; packages are paid upfront in IDR.
- Fuja Rahayu Kinanti is the only confirmed psychologist, serves individual/couple; availability is PRD placeholder `anytime/anyplace` and non-blocking for design.
- Midtrans Snap is the single launch gateway; QRIS + bank transfer/VA only; second gateway and other methods deferred.
- Payment truth is verified webhook/PaymentEvent; late payment is paid_late reconciliation; no alternate auto-assignment.
- Cancellation has no automatic cutoff and is Admin case-by-case; pending preserves reservation.
- CancellationDecision is approve/deny; approval atomically cancels/releases/restores; no separate Release Slot action.
- RefundAction is separate and launch-limited to full_refund/no_refund; partial refund deferred; one Admin may execute both separate actions.
- Admin + Psychologist active; Editor deferred. Staff use Google SSO + invite/allowlist + explicit StaffMembership; two Admin bootstrap.
- Clinical/ethical and technical/data owners jointly sign off privacy/consent/retention.
- Client/contact retention is 12 months; Payment/Refund and Audit/security follow applicable policy; Consent follows related records/policy; expiry redacts direct identifiers and preserves minimum pseudonymous links.
- PRD/design handoff is allowed with explicit placeholders; production remains gated by UAT and operational evidence.
- Couple package uses `BookingParticipant` (child of `Booking`) and `AppointmentParticipant` (child of `Appointment`) with three party roles (`participant_a`, `participant_b`, `payer`) and one derived relational label (`joint_attendees`); per-participant `ConsentRecord`, restricted cross-partner visibility, per-participant ClientAccess token, and withdrawal/no-show semantics for A/B/joint Sessions (`ADR 0090`); couple-package cancellation target resolution and atomic effects per `ADR 0095 §6`.
- Appointment outcome taxonomy is five-valued (`completed`, `completed_partial`, `no_show` early T+15m checkpoint, `no_show_late` late arrival with session held, `cancelled`) per `ADR 0092`; only `cancelled` does not consume entitlement; `OutcomeCorrection` window 7×24 jam.
- Settlement uniqueness (at-most-one successful payment per Booking intent, value match, idempotency-keyed outbox, late-paid package creation) per `ADR 0093`.
- Cancellation matrix (target types, open-request invariant, race R1–R4, atomic package-wide effects, partial-package 1-of-N, repeat/correction, `RescheduleAction` table, couple override) per `ADR 0095`.

# ADR index

Working ADR index: docs/adr/0001–0095. Closure decisions 0067–0095 cover Admin cancellation/refund workspace, Midtrans Snap launch gateway, QRIS+bank transfer/VA scope, program/bookable scope, counseling catalog, launch psychologist, cancellation/refund/approval, staff access/bootstrap, privacy/retention/anonymization, PRD handoff vs production gate, the couple package participant model (`ADR 0090`), capacity overlap + TransitionBuffer (`ADR 0091`), appointment outcome timing + late-arrival correction (`ADR 0092`), settlement uniqueness + paid-late package creation (`ADR 0093`), intake/minor/eligibility/cutoff (`ADR 0094`), and the package cancellation matrix + outcome race resolution (`ADR 0095`). ADR 0064 is historical/superseded for required WhatsApp timing/task semantics; ADR 0066 governs optional manual support; ADR 0089 ratifies the Cloudflare Worker + D1 architecture; ADR 0090 governs the couple package `BookingParticipant`/`AppointmentParticipant` model; ADR 0095 closes `TBC-PACKAGE-CANCEL-01` and `TBC-RESCHEDULE-01`.

