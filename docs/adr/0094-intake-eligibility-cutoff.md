# 94. Intake Field Schema, Minor (16–17) Guardian Route, Eligibility Boundary, and Booking Cutoff

## Status

Accepted for the MVP working model. Closes `TBC-INTAKE-01`, `TBC-MINOR-01`, `TBC-ELIGIBILITY-01`, and `TBC-BOOKING-CUTOFF-01` from `PRD-GUIDELINE-REVIEW.md` Round 1 P0-04 and Round 2 R2-04. Implements the booking-intake minimum, age policy, eligibility/exclusion, and lead-time rules that `Booking`, `Client`, `OfferSnapshot`, `SlotHold`, `Appointment`, and `ConsentRecord` depend on.

## Context

### Intake

Round 1 P0-04 (`PRD-GUIDELINE-REVIEW.md:169–198`) flagged that the booking transaction still had no final field schema. `IMPLEMENTATION-GUIDE.md:399–422` documented only the high-level data boundary, not the exact transactional fields or their validation. JSON `booking_intake` was `Nama\nNO HP` (Round 2 R2-04) — too thin for verified email-driven `ClientAccess`, payment/booking confirmation email, consent binding, and crisis-boundary routing.

ADR 0006 (minimize Booking data) restricts what may be collected, but it does not enumerate the fields or rule out a `consent_version` field that ties the booking to a versioned `ConsentRecord` (ADR 0008).

### Minor (16–17)

`aud_needs`/`aud_exclusion` and the crisis/non-emergency boundary are already final in the non-technical JSON. Age policy 18+ is implied by the absence of a guardian flow in `IMPLEMENTATION-GUIDE.md` and by `ADR 0002` (guest booking) which does not address minor consent. `ADR 0090` (Couple participant model, 2026-08-31) lists minor/guardian as an open follow-up.

### Eligibility / referrals

`aud_needs` and `aud_exclusion` are final in the JSON. Crisis boundary text is final in the JSON (resolves `Round 2` crisis gap). `referrals` text is still empty in the JSON — this ADR freezes the operational wording and ownership so the website can be wired without waiting for the PRD update.

### Cutoff

JSON declared `booking_cutoff = minimal 1 jam sebelum`. Guide default is `SlotHold TTL = 10 menit` (`IMPLEMENTATION-GUIDE.md:271`, `ADR 0014`). The session itself is 60 minutes (`ADR 0073`). The relation between **slot-publication cutoff** (when a slot disappears from the public calendar), **booking-cutoff** (when a guest may still create a Booking against an already-exposed slot), **reschedule-cutoff**, and **cancellation-cutoff** was not previously defined; only the cancellation policy is documented (`ADR 0076`: no automatic cutoff, Admin case-by-case).

## Decision

### 1. Booking intake — final field schema and validation

The `Booking` aggregate carries the minimum transactional identity required to identify the contact, deliver the transaction, notify the client, record required consent, and connect to `ServiceOffering`, `SlotHold`, `Appointment`, and `Payment`. The schema below is **final for launch** and applies to both single-session and package-purchase `CreateBooking` invocations. Couple bookings additionally carry `BookingParticipant` rows (`ADR 0090`).

#### 1.1 Client fields (transactional identity on `Client`)

| Field | Type | Required | Validation rule |
|---|---|---|---|
| `id` | uuid | auto | server-generated |
| `display_name` | string (max 120 chars, trimmed) | **yes** | non-empty after trim; no clinical detail; no numeric-only; no email-like patterns |
| `contact_email` | string | **yes** | RFC 5322 syntax; length ≤ 254; lowercase normalized; reject role addresses (`noreply@`, `admin@`, `postmaster@`, `abuse@`); verified by email magic link/OTP before `Booking.confirmation` |
| `contact_phone` | E.164 string OR null | no | if present: must match `^\+[1-9]\d{6,14}$` (international E.164); used only for optional Admin manual WhatsApp support (`ADR 0066`); never used for lifecycle |
| `age_at_booking` | integer OR null | conditional | required when `audience_policy = self_service_18_plus` AND age-band claim is needed; else optional. Snapshot age, never mutated. |
| `date_of_birth` | date OR null | conditional | required when client is 16 or 17 (guardian-route) to compute `is_minor=true`; otherwise optional. Stored ISO-8601 in `Asia/Jakarta`. |
| `is_minor` | boolean | auto-derivable | computed at booking create: `true` iff `date_of_birth` resolves to age 16 or 17 at `Booking.created_at`; persisted for invariant check |
| `guardian_payload` | object OR null | conditional | required when `is_minor=true`. See §2.2. Rejected otherwise |
| `audience_match` | enum | auto-derivable | `eligible_18_40` \| `minor_16_17_guardian` \| `out_of_scope` (see §3) |
| `created_at` | timestamp (Asia/Jakarta) | auto | server-generated |
| `updated_at` | timestamp | auto | updated only via audited Admin action |

#### 1.2 Booking intake fields (per transaction, child of `Client`)

| Field | Type | Required | Validation rule |
|---|---|---|---|
| `short_message` | string OR null | no | max 280 chars after trim; HTML stripped; reject if matches clinical-pattern regex (see §1.4); helper text in UI explicitly marks field as **non-clinical**; never used for triage/escalation |
| `consent_version` | string | **yes** | must match an entry in the active `ConsentCatalog` for purpose `booking_transactional`; frozen at `Booking.created_at` |
| `crisis_disclaimer_acknowledged` | boolean | **yes** | must be `true`; checkbox "I understand Seraya is not an emergency/crisis service" |

The `consent_version` field is a **requirement**, not a soft default. It pairs one-to-one with an immutable `ConsentRecord` of purpose `booking_transactional` (`ADR 0008`). The record stores the **policy_version** the client accepted, the **timestamp**, and the **source** (`public_web_v1` for the launch booking flow).

#### 1.3 Field rejection rules

A `CreateBooking` command MUST reject and return typed errors in these cases:

- `E-INTAKE-MISSING-NAME` — `display_name` empty or fails trim validation.
- `E-INTAKE-MISSING-EMAIL` — `contact_email` absent or invalid.
- `E-INTAKE-INVALID-CONSENT-VERSION` — `consent_version` not in current `ConsentCatalog` for `booking_transactional`.
- `E-INTAKE-CRISIS-ACK-NOT-SET` — `crisis_disclaimer_acknowledged` is not `true`.
- `E-INTAKE-CLINICAL-NARRATIVE` — `short_message` matches the clinical-pattern blocklist.
- `E-INTAKE-INVALID-PHONE` — `contact_phone` present but not E.164.
- `E-MINOR-NO-GUARDIAN` — `is_minor=true` but `guardian_payload` is null/invalid.
- `E-MINOR-INVALID-GUARDIAN-CONSENT` — `guardian_consent.version` missing or stale.
- `E-ELIGIBILITY-OUT-OF-SCOPE` — `audience_match = out_of_scope` (see §3).
- `E-CUTOFF-TOO-LATE` — `now > slot_start - booking_cutoff_window` (see §4).

#### 1.4 Clinical-pattern blocklist (`short_message`)

Reject `short_message` if it matches any of these patterns (case-insensitive, extended-regex):

- suicide ideation: `(bunuh diri|suicide|kill myself|ending my life|不想活)`
- self-harm: `(self[- ]harm|self harm|melukai diri)`
- acute crisis: `(darurat|emergency|panic attack|serangan panik)`
- acute harm-to-others: `(akan membunuh|going to kill)`
- clinical symptom narrative: 5+ consecutive symptom tokens joined by AND/OR (`(depresi|anxiety|anxietas|panic|halusinasi|delusi|paranoid|insomnia)\s+dan\s+(depresi|anxiety|anxietas|panic|halusinasi|delusi|paranoid|insomnia)`)

On match, the booking is **not rejected**; instead `short_message` is **truncated and replaced** with `[Klien menyatakan pesan yang tampak klinis; silakan hubungi Admin WhatsApp untuk dukungan]` and an `AuditRecord` of action `intake_clinical_message_redirected` is written. The typed error `E-INTAKE-CLINICAL-NARRATIVE` is returned only when the runtime cannot safely truncate (e.g., patterns broken across multiple submissions).

### 2. Minor (16–17) policy — launch-ready with guardian route

#### 2.1 Decision: launch-ready, not deferred

The age policy at launch is:

- **18 or older AND age in `{18,…,40}`** — direct self-service booking. `audience_match = eligible_18_40`.
- **16 or 17** — direct self-service is blocked; the booking flow routes to a **guardian-consent first** path. `audience_match = minor_16_17_guardian`.
- **Under 16** — booking is blocked at validation. `audience_match = out_of_scope`.
- **41 or older** — booking is blocked at validation. `audience_match = out_of_scope`.

Why launch-ready rather than deferred (the ADR 0090 reviewer-deferred branch):

- The business owner has confirmed 16–17 as a served audience in `aud_needs` (JSON); deferring the entire age band would contradict a confirmed business scope statement.
- The guardian flow is a thin extension on top of `ClientAccess` (`ADR 0020`) and versioned `ConsentRecord` (`ADR 0008`) — both already in the working model.
- Couple `ADR 0090` deliberately defers guardian-for-joint-session to post-MVP; this ADR covers the **individual** minor flow only. A minor participating in a couple booking is **DEFERRED** to a post-MVP ADR (the couple package itself is `TBC-COUPLE-LAUNCH-01`-blocked, so the minor-in-couple question does not affect day-one).

#### 2.2 Guardian payload schema

When `is_minor=true`, the booking create MUST also persist a `guardian_payload` (server-side, with a typed child entity `GuardianConsent`):

| Field | Type | Required | Validation rule |
|---|---|---|---|
| `guardian_full_name` | string | yes | non-empty after trim; max 120 chars |
| `guardian_relationship` | enum | yes | one of `parent` \| `legal_guardian` \| `other_with_letter` |
| `guardian_contact_email` | string | yes | RFC 5322; verified by email magic link before guardian consent considered valid |
| `guardian_contact_phone` | E.164 string OR null | no | same E.164 rule as `contact_phone` |
| `guardian_consent.version` | string | yes | matches `ConsentCatalog` for purpose `minor_guardian_consent` |
| `guardian_consent.accepted` | boolean | yes | must be `true` |
| `guardian_consent.evidence_token_id` | uuid | yes | FK to the `ConsentRecord` produced by verified guardian magic link |
| `guardian_consent.acknowledged_at` | timestamp | yes | server-set at verified acceptance |

#### 2.3 Guardian flow (sequence)

1. Minor submits intake with `date_of_birth`; system computes `is_minor=true` and `audience_match = minor_16_17_guardian`.
2. Booking create is held in `pending_guardian_consent` — no `OfferSnapshot`, no `SlotHold`, no payment intent.
3. System sends a magic link to `guardian_contact_email`. Token is 15 minutes (`ADR 0020`); scoped action is `accept_minor_guardian_consent`.
4. Guardian opens link, sees a non-clinical disclosure page that summarizes the booking context (psychologist, modality, slot, mode, price), and clicks Accept on `ConsentCatalog[purpose=minor_guardian_consent]` version text.
5. On Accept: `ConsentRecord` (purpose=`minor_guardian_consent`, source=`guardian_magic_link_v1`) is written; `guardian_payload` is persisted; `Booking` transitions to `pending_payment` and a `SlotHold` is created (TTL 10 minutes, `ADR 0014`).
6. If guardian declines or link expires without action within 24 hours: `Booking` is `cancelled_consent_not_granted`; no `OfferSnapshot`, no `SlotHold`, no `Payment`. The minor (and the guardian, if independently contacted) is shown a referral block per §3.

#### 2.4 ClientAccess for minors

The minor's `ClientAccess` is **scoped to the Booking** (per `ADR 0020`), and the guardian receives a parallel `couple_billing_access`-style **scoped** token for monitoring only — read access to the booking state, **no mutation** authority. Mutation requests (reschedule, cancellation) flow through Admin WhatsApp (`ADR 0066`, `ADR 0067`).

#### 2.5 Audit

Every guardian flow writes two `AuditRecord` rows: `minor_guardian_consent_requested` and `minor_guardian_consent_accepted` | `minor_guardian_consent_expired` | `minor_guardian_consent_declined`.

### 3. Eligibility boundary, exclusions, and referrals

#### 3.1 Audience match (server-derivable enum)

Computed at booking create; the UI surfaces the matching copy. This enum is the **single source of truth** for served/excluded decisions — domain code never reads `aud_needs`/`aud_exclusion` strings directly.

| Value | Trigger | Booking action |
|---|---|---|
| `eligible_18_40` | age 18–40 AND `aud_needs` matched | proceed to consent + payment |
| `minor_16_17_guardian` | age 16–17 AND `aud_needs` matched | route to guardian flow (§2) |
| `out_of_scope_age` | age <16 OR age >40 | block + show §3.3 referrals |
| `out_of_scope_needs` | client self-declares out-of-band need (clinical specialty, sub-specialty, etc.) | block + show §3.3 referrals |
| `out_of_scope_exclusion` | client's intake matches `aud_exclusion` items (active suicidality with plan, active psychosis, mandated court-ordered evaluation, etc.) | block + show §3.3 referrals; do **not** store the disclosure |

The category names mirror the JSON `aud_needs` and `aud_exclusion` text via a controlled vocabulary table, not by free-form string match.

#### 3.2 Crisis and non-emergency boundary (final text)

Crisis boundary text on the public site is fixed to the JSON's final wording (referenced; do not paraphrase in code copy):

> "Seraya adalah layanan konseling psikologi untuk proses pengembangan diri dan dukungan psikologis. Seraya **bukan** layanan darurat, krisis, atau gawat darurat. Jika Anda atau orang terdekat Anda dalam bahaya segera, mengalami pikiran untuk menyakiti diri sendiri, atau dalam keadaan darurat medis/psikososial, **silakan hubungi**:

> - **Darurat medis / psikososial**: 119 atau Instalasi Gawat Darurat (IGD) rumah sakit terdekat.
> - **Hotline krisis kesehatan jiwa**: Sejiwa (119 ext. 8), Into The Light (119 ext. 4), atau LSM krisis di kota Anda.
> - **Konsultasi non-darurat**: melalui Admin WhatsApp Seraya pada jam operasional.

> Pesan di kolom formulir **tidak dipantau 24/7** dan tidak boleh digunakan untuk situasi krisis. Layanan ini hanya untuk预约 janji temu konseling."

> Bahasa Indonesia is the primary version; English or bilingual display is DEFERRED.

#### 3.3 Referrals text (final, frozen until PRD update)

The following wording is **operationally final for launch** and replaces the empty `referrals` field in the JSON. The clinical/ethics lead and the operations owner may update this list through a controlled version of the public `CrisisNotice`. The wording below is reproduced in public pages, the `out_of_scope` block page, the post-decline page, and the email receipt for `cancelled_consent_not_granted` / `out_of_scope_*` bookings.

```
REFERENSI DAN DUKUNGAN LAIN

Untuk kondisi di luar layanan Seraya, silakan merujuk ke:

1. Darurat medis / kegawatdaruratan
   - Hubungi 119 atau datang ke IGD rumah sakit terdekat.

2. Krisis kesehatan jiwa (24/7)
   - Sejiwa: 119 ext. 8 (Kemenkes RI)
   - Into The Light: 119 ext. 4
   - LSM krisis lokal di kota Anda.

3. Layanan konseling di luar Seraya
   - Puskesmas dengan psikolog klinis
   - Rumah Sakit Umum Daerah (RSUD) dengan poli psikologi / psikiatri
   - Himpunan Psikologi Indonesia (HIMPSI) untuk rujukan profesional

4. Dukungan harian
   - Komunitas dukungan sebaya (cancer support, grief support, dll.)
   - Layanan konseling keagamaan (bagi yang membutuhkan)

Seraya tidak menjalankan triage, asesmen, atau rujukan klinis.
Untuk pertanyaan administratif, hubungi Admin WhatsApp Seraya.
```

If the PRD team supplies a different final `referrals` text later, that text replaces this block via a single-file edit on the versioned `CrisisNotice` content entry; no schema or code change is required.

### 4. Booking cutoff — minimal 1 jam sebelum sesi start

#### 4.1 Definitions

| Term | Definition | Source |
|---|---|---|
| **booking_cutoff_window** | fixed 1 hour before `slot_start` (in `Asia/Jakarta`) | this ADR |
| **slot_publication_window** | rolling 0..90 days future, per `IMPLEMENTATION-GUIDE.md:330` and `ADR 0058` | guide + ADR 0058 |
| **SlotHold TTL** | 10 minutes from `SlotHold.created_at`, per `ADR 0014` | ADR 0014 |

The three are different durations serving different purposes:

- `slot_publication_window` controls **what is exposed to the public calendar**.
- `booking_cutoff_window` (= 1 hour) controls **whether a new Booking may begin on a given slot** (final purchase gate).
- `SlotHold TTL` (= 10 minutes) controls **how long a payment window may remain open** once a slot has been selected.

#### 4.2 Decision

A `CreateBooking` command MUST reject with `E-CUTOFF-TOO-LATE` if `now > slot_start - booking_cutoff_window` (i.e., `slot_start - now < 1 hour`). Equivalently, the slot is hidden from the public date-picker once `now >= slot_start - booking_cutoff_window`.

Same-day booking is **allowed** because the cutoff is measured from the slot, not from calendar midnight. A client may book a slot starting in 90 minutes at 13:00 for a 14:30 slot, but cannot book a slot starting in 45 minutes. This rule is uniform across day-of-week and applies to online and offline modes.

#### 4.3 Reschedule and cancellation cutoffs

Reschedule uses the **same 1-hour cutoff** as new booking (no relaxed cutoff for reschedule). After the 1-hour cutoff, the only path is `CancellationRequest` via Admin WhatsApp (`ADR 0066`, `ADR 0076`).

Cancellation has **no automatic cutoff** at launch (`ADR 0076`). Admin reviews case-by-case. `CancellationDecision.approve` may approve even past the 1-hour lead time; that is an Admin authority, not a client-flow authority.

#### 4.4 Coupling with payment expiry

`SlotHold TTL = 10 menit`. The 1-hour cutoff applies **before** `SlotHold` is created; after creation, the 10-minute hold runs on top of an already-cutoff-passed slot only because the slot was generated before the cutoff. If a client starts checkout at T-55 minutes (allowed) and the hold expires at T-45 minutes, the booking enters `hold_expired`; Admin WhatsApp is the recovery channel. We do not extend the hold automatically because the slot is past the booking cutoff window.

#### 4.5 Audit

Every cutoff rejection writes an `AuditRecord` row: `action = `intake_cutoff_rejected`, `target_type = booking_intent`, `reason_code = `E-CUTOFF-TOO-LATE`, including `slot_start`, `client_now`, and `cutoff_window_minutes`.

## Consequences

Positive:

- Single source of truth for intake field validation; no schema split between JSON and guide.
- Minor flow is launch-ready on top of existing `ClientAccess` and `ConsentRecord`, avoiding a separate SEAN-C pathway.
- Eligibility, crisis, and referrals text are versioned in code through `CrisisNotice` / `ConsentCatalog`, so future wording updates are a single-file change.
- Booking cutoff is a numeric invariant with a typed rejection error, testable in unit and integration tests.

Costs and constraints:

- `Client.contact_email` becomes the verified identity anchor; loss of email access is the loss of `ClientAccess`. Recovery is `TBC-ACCESS-01`.
- Guardian flow adds a 24-hour SLA risk; operations owner must monitor orphan `pending_guardian_consent` bookings.
- Cutoff = 1 hour means fewer same-day slots; client UX must show next-available cutoff-passing slot.
- Clinical-pattern blocklist is a heuristic; it is not a triage system and must not replace human review for any borderline case.

## Implementation notes

- `Booking.created_at`, `slot_start`, and `cutoff_window_minutes` are the three inputs the cutoff check needs; everything else is logged only.
- `Client.age_at_booking` is a snapshot; we never re-derive it from `date_of_birth` for invariant checks because `date_of_birth` may be cleared before retention expiry.
- `guardian_payload` is a child entity `GuardianConsent`, not an inline field; it has its own retention category separate from `Client.contact_*` per `IMPLEMENTATION-GUIDE.md §9.2`.

## Open follow-up

- **Closed by this ADR**: `TBC-INTAKE-01`, `TBC-MINOR-01`, `TBC-ELIGIBILITY-01`, `TBC-BOOKING-CUTOFF-01`. Carry-forward items:
  - Exact `ConsentCatalog` wording for `booking_transactional` and `minor_guardian_consent` (clinical/ethics sign-off) — `TBC-CONSENT-01`.
  - Crisis-boundary final Indonesian copy review by clinical lead before production publish — owner: clinical lead.
  - `referrals` final wording alignment with PRD team — owner: product + ops. Single-file edit to `CrisisNotice` content entry when delivered.
  - Couple-package minor (`ADR 0090` follow-up) — DEFERRED post-MVP; not affected by couple launch-defer status.
- **Not closed here**: architecture ADR (`TBC-STACK-01`), couple participant launch (`TBC-COUPLE-LAUNCH-01`), capacity overlap/buffer (`TBC-CAPACITY-01` / `TBC-BUFFER-01`), staff-session baseline (`TBC-STAFF-SESSION-01`), payment TTL/cutoff coupling (`TBC-PAY-01`), no-show grace (`TBC-NO-SHOW-01`).

## Reference

- `IMPLEMENTATION-GUIDE.md:399–422` (data boundary), `:8.1` (append-only consent), `:9.2` (retention categories)
- `DOMAIN-MODEL.md` — `Client`, `Booking`, `ConsentRecord`, `OfferSnapshot`, `SlotHold`, `Appointment`, `Notification`, `CrisisNotice`
- `CONTEXT.md` — `Client`, `ClientAccess`, `BookingData Boundary`, `ConsentRecord`, `Notification`
- ADR 0002 (guest booking with optional account), 0006 (Booking data minimization), 0008 (versioned consent), 0014 (10-minute SlotHold), 0020 (scoped guest access), 0052 (24h/2h reminders), 0058 (future-slot generation), 0066 (flexible Admin WhatsApp), 0067 (Cancellation & Refund workspace), 0076 (case-by-case cancellation), 0077 (full/no-refund only), 0082 (joint privacy/consent sign-off), 0083 (12-month Client/contact retention), 0087 (Client redaction/pseudonymization), 0090 (couple participant model)
- `PRD-GUIDELINE-REVIEW.md` Round 1 P0-04, Round 2 R2-04 (intake), R2-12 (biz_location), Round 3 conflict resolution
- JSON `booking_intake`, `aud_needs`, `aud_exclusion`, `crisis`, `booking_hold`, `booking_cutoff`, `booking_access`, `consents`
