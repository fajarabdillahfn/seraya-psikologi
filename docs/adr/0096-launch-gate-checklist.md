# 96. Launch-Gate Executable Checklist (Matrix §7 → owner-by-owner)

## Status

Accepted for MVP launch planning. Closes `TBC-LAUNCH-GATE-DETAIL-01` from `PRD-GUIDELINE-REVIEW.md` Round 2 R2-13 and replaces the high-level `launch_gate` paragraph in `seraya-psikologi-nonteknis-2026-08-31.json` with a structured, executable, owner-attributed checklist. Adopts the six Matrix §7 release gates as the production-launch gates of record; lifts `ADR 0088-prd-handoff-production-gate.md:11–21` into a concrete gate list with named roles, blocking stages, and acceptance evidence. Closes the "no executable checklist, owner sign-off unverifiable" gap identified in `Ticket 07`. This ADR does not authorize live launch on its own; each gate must be ticked independently with its acceptance evidence attached.

Authority rule (locked 2026-08-31): for business-scope conflicts, the **non-technical source wins** (Round 3 in `PRD-GUIDELINE-REVIEW.md`). Where this ADR's gate text restates a business decision (e.g. "only SERAYA PULANG bookable at launch", "no public cancellation/refund UI"), it cites the non-technical source of truth and is consistent with it.

## Ringkasan eksekutif (Bahasa Indonesia)

- Matrix §7 mendefinisikan enam release gate untuk production launch. ADR ini mengangkat keenam gate menjadi **executable checklist**: setiap gate punya **owner named-role**, **blocking stage** (`before slice`, `before UAT`, atau `production only`), dan **acceptance evidence** (artifact path, URL, atau signed record). Tidak ada `TBD`/`TBC` cell.
- Checklist dipisah dua lapis: **(A) PRD/design handoff** (boleh proceed now dengan placeholder) dan **(B) Production launch** (harus pass semua gate sebelum live). Pemisahan ini menjalankan `ADR 0088` "PRD completion ≠ launch approval".
- Enam gate Matrix §7 diangkat satu-per-satu dengan acceptance evidence yang spesifik dan dapat diverifikasi (signed form, configuration value, runbook URL, log sample, dsb.). Gate yang menyentuh gate lain (mis. consent copy ↔ `TBC-CONSENT-01`) menyatakan dependency eksplisit.
- Gate tambahan yang disisipkan karena non-technical source of truth (R3 cancellation/refund resolution, intake/eligibility/cutoff dari `ADR 0094`, no-show timing dari `ADR 0092`, settlement uniqueness dari `ADR 0093`, package cancellation matrix dari `ADR 0095`, couple participant model dari `ADR 0090`) diberi label `(matrix §7 plus)` agar auditable.
- Acceptance criteria tiket: (1) `IMPLEMENTATION-GUIDE.md §16` mengadopsi Matrix §7 dengan owner + evidence per gate — dipatch di sini; (2) owner-by-owner sign-off table — tabel di §3; (3) split PRD-handoff vs production-launch — §2 dan §3.

## Context

`seraya-psikologi-nonteknis-2026-08-31.json` `launch_gate` paragraph hanya menyatakan bahwa launch menampilkan 4 program dengan hanya SERAYA PULANG yang bookable/paid. Matrix §7 release gates (dirujuk di `PRD-GUIDELINE-REVIEW.md Round 2 R2-13` line 764 dan `Ticket 07` lines 22–27) sudah lebih spesifik — enam gate eksplisit:

1. Placeholder venue, schedule, profile asset, service presentation — fixture only, bukan paid.
2. Real availability, online joining instructions, offline venue.
3. Approved consent, privacy notice, cancellation/refund policy, crisis/referral information.
4. Verified payment integration and reconciliation behavior.
5. Booking confirmation/reminder flow and operational owner.
6. Couple-participant/consent decisions if couple counselling is bookable.

`ADR 0088` menyatakan production launch tetap gated pada: UAT pass, Midtrans evidence, two-Admin bootstrap, verified psychologist credentials/publication consent, replacement of `anytime/anyplace` dengan production schedule/location, approved consent/RetentionPolicy values, dan notification/payment failure handling.

`IMPLEMENTATION-GUIDE.md §16` (current state) hanya mendaftar gate sebagai bullet bernarasi tanpa owner, tanpa blocking stage, dan tanpa acceptance evidence. `Ticket 07` line 7-8: "Matrix §7 release gates sudah lebih spesifik, tapi belum masuk ke `IMPLEMENTATION-GUIDE.md` sebagai checklist owner-by-owner. Tanpa executable checklist, owner sign-off akan sulit diverifikasi."

Risiko jika checklist tidak executable: (a) `PRD/design handoff` disalahartikan sebagai `production launch ready`; (b) sign-off yang diminta dari owner tidak membawa evidence, sehingga tidak dapat diaudit; (c) gate baru (settlement uniqueness, intake/eligibility, package cancellation, couple participant) yang sudah ADR-resolved tidak masuk launch checklist.

Ticket acceptance criteria (`Ticket 07` lines 29–33):

- `IMPLEMENTATION-GUIDE.md §16 Production launch gate` mengadopsi Matrix §7 dengan owner + evidence per gate — dipatch di §5.
- Owner-by-owner sign-off table: siapa yang harus approve apa — dirinci di §3.
- Setiap gate punya blocking stage — kolom `blocking stage` di §3.
- Checklist dipisah: PRD/design handoff vs production launch — §2 dan §3.

## Diskusi multi-perspektif

### Business owner (non-teknis, source of truth untuk scope)

- Owner bisnis hanya menandatangani gate yang menyentuh keputusan bisnis: program scope, copy publik (konsen, krisis, pembatalan, retensi), jadwal psikolog, harga, dan kelayakan audiens. Gate teknis (signature verification, idempotency key, partial index) tidak membutuhkan tanda tangan owner bisnis; gate tersebut ditandatangani technical owner dengan verifikasi otomatis (test green, migration applied).
- Matrix §7 gate 6 (couple-participant) relevan **hanya jika** couple bookable di launch. Rekomendasi `PRD-GUIDELINE-REVIEW.md Round 2 R2-07` adalah defer couple sampai participant model fix; jika owner bisnis memilih couple launch-deferred, gate 6 menjadi "not applicable at launch" dan diturunkan statusnya. Default ADR ini: **gate 6 tetap masuk checklist dengan dua state** (`applies` vs `deferred-by-business-decision`); owner bisnis yang menyatakan keputusan couple-launch wajib mengisi satu dari dua nilai.
- Gate `real availability` (Matrix §7 #2) tidak dapat dipenuhi oleh psikolog saja; psikolog menyediakan jadwal recurring, tetapi Admin mengkonfirmasi slot ke sistem dan menyediakan offline venue. Owner bisnis memastikan psikolog sudah commit; Admin mengkonfirmasi venue.

### Clinical/ethics

- Consent wording (gate 3) sudah ada di JSON (8-section per `Ticket 06`); clinical/ethics menandatangani **versi final** yang akan dipublish, bukan draft. Versi final menjadi `ConsentRecord.version` reference. `TBC-CONSENT-01` harus closed sebelum gate 3 ditandatangani.
- Crisis boundary text (gate 3) sudah ada di JSON `crisis`; clinical/ethics menandatangani copy final. `referrals` masih kosong per `PRD-GUIDELINE-REVIEW.md Round 4 status`; ini adalah sub-gate yang harus closed sebelum gate 3 evidence lengkap.
- Privacy notice (gate 3) mengikuti `retention` di JSON (12 bulan setelah last active service) dan `ADR 0083`/`0086`; clinical/ethics menandatangani retensi sesuai policy.

### Operations (admin/finance)

- Gate 4 (payment integration) membutuhkan tiga sub-evidence: (a) Midtrans sandbox test pass, (b) production merchant activation (QRIS + VA enabled, refund capability verified), (c) reconciliation runbook published. Operations menandatangani kesediaan operational owner; finance menandatangani rekonsiliasi kas/mutasi.
- Gate 5 (booking confirmation/reminder) membutuhkan: (a) email delivery evidence untuk confirmation + reminders (24 jam & 2 jam) dengan delivery rate ≥ X; (b) Admin WhatsApp number published sebagai channel cancellation/refund; (c) Admin runbook siapa yang on-call saat payment failure.
- Two-Admin bootstrap (gate dari `ADR 0088`) diverifikasi oleh operations dengan melihat `StaffMembership` rows dan last-active-Admin guard.

### Engineering (technical)

- Setiap gate teknis diverifikasi dengan **run-id / commit-hash / migration-id** atau test result file. Acceptance evidence adalah artifact, bukan narasi.
- Idempotency dan uniqueness gates (yang sudah ADR-resolved di `ADR 0093` settlement uniqueness, `ADR 0095` cancellation matrix, `ADR 0091` capacity overlap) diverifikasi lewat integration test di `IMPLEMENTATION-GUIDE.md §13`. Test file path adalah evidence.
- Midtrans evidence (gate 4): webhook signature verification, value-match verification (`ADR 0093 §2`), dan reconciliation cadence. Engineering menandatangani ini setelah sandbox test green dan production merchant aktif.
- Gate "real availability" membutuhkan AvailabilityRule/Exception/Slot data populated dari psikolog (bukan placeholder `anytime/anyplace`); engineering memverifikasi via query result.

## Decision

### §1. Scope of this checklist

This ADR adopts the six Matrix §7 release gates as the production-launch gates of record. Each gate:

- has a **named-role owner** (clinical/ethics, business owner, operations, finance, technical);
- has a **blocking stage** (`before slice`, `before UAT`, or `production only`);
- has **acceptance evidence** that is an artifact (file path, URL, signed record, run-id, or query result), not a narrative.

Where a gate already maps to an accepted ADR, the ADR is cited as the canonical rule and the evidence is the artifact required by that ADR. Where a gate requires a decision that is not yet ADR-closed (e.g. `TBC-CONSENT-01`, `TBC-REC-01`), the gate is **explicitly blocked by that TBC** in the evidence row.

This ADR does not authorize live launch. Each gate must be ticked independently with its evidence attached. The release manager (operations) is responsible for collecting evidence and the business owner signs the consolidated checklist.

### §2. PRD/design handoff checklist (allowed now)

These items are **not** gates for PRD/design handoff. Handoff may proceed now using `IMPLEMENTATION-GUIDE.md`, ADR 0001–0095, and explicit placeholders per `ADR 0088`. The table below records what handoff may assume vs. what it must mark as `placeholder`.

|| # | Item | Handoff assumption | Placeholder / explicit marker |
||---|---|---|---|
|| H-1 | Domain model vocabulary | `DOMAIN-MODEL.md` + ADR 0089–0095 | none |
|| H-2 | Aggregate ownership | `ADR 0095 §3` (Booking/Appointment/PackagePurchase/SessionEntitlement) | none |
|| H-3 | Catalog/pricing (individual only) | `IMPLEMENTATION-GUIDE.md §2.1` + `ADR 0074` | couple: see §3 G-6 |
|| H-4 | Catalog/pricing (couple) | shown in catalog with badge `coming soon` per `PRD-GUIDELINE-REVIEW.md Round 2 R2-07 recommendation` | explicit `not_purchasable` until G-6 evidence |
|| H-5 | Identity/auth model | `ADR 0080` Google SSO + `ADR 0081` two-Admin bootstrap | staff-session TBC carries forward |
|| H-6 | State machines | Booking/Payment/Appointment/Package/Entitlement/Cancellation/Refund per `ADR 0095` + `ADR 0093` + `ADR 0092` | none |
|| H-7 | Module seams | `IMPLEMENTATION-GUIDE.md §5` | TBC-API-01 routes/payload |
|| H-8 | Test seams | `IMPLEMENTATION-GUIDE.md §13` | none |

### §3. Production-launch checklist (Matrix §7, executable)

The table below is the canonical checklist. `Blocking stage` legend:

- `before slice` — must close before the implementation slice that depends on it can start.
- `before UAT` — must close before UAT scenarios from `IMPLEMENTATION-GUIDE.md §13.3` are recorded as pass.
- `production only` — must close before production DNS/worker switches from staging to live domain, but does not block UAT.

| Gate | Title | Owner (named role) | Blocking stage | Acceptance evidence (artifact) | Source ADR / doc |
|---|---|---|---|---|---|
| **G-1** | Profile asset, service presentation, placeholder venue/schedule clearly marked `fixture-only`, NOT paid at launch | **business owner** + **technical** | `before UAT` | (a) `PsychologistProfile.publish_status` for non-Fuja slots = `not_published` (verified by D1 query — `SELECT id, publish_status FROM psychologist_profile WHERE publish_status <> 'published'` returns empty); (b) catalog page screenshot showing `coming soon` badge on couple offerings; (c) `Fuja` profile fields (name, license number redacted in shared artifacts, expertise, education, photo) complete per `ADR 0075` and `Ticket 06 06.6`; (d) sign-off note from business owner confirming "no live paid booking except SERAYA PULANG individual counseling". | `ADR 0075`, `Ticket 06 06.6`, `PRD-GUIDELINE-REVIEW.md Round 2 R2-08` |
| **G-2** | Real availability + online joining instructions + offline venue | **operations** + **psychologist (Fuja)** + **technical** | `before UAT` | (a) `AvailabilityRule` rows populated for Fuja's recurring schedule (D1 query result: ≥1 weekday + ≥1 weekend rule with `is_published = true`); (b) `AvailabilityException` for any blackout periods; (c) **no row with `location_label = 'anytime'`** in published slots (verified by query — `SELECT id FROM availability_slot WHERE location_label IN ('anytime','anyplace') AND is_published = true` returns empty); (d) online join instructions (meeting URL template + access code policy) saved as `docs/operations/online-join-instructions.md` and referenced in confirmation email; (e) offline venue name + address + access notes saved as `docs/operations/offline-venue.md`; (f) psychologist sign-off confirming schedule is current. | `ADR 0075`, `ADR 0088:17`, `TBC-SCHEDULE-01` (closes here as evidence) |
| **G-3** | Approved consent, privacy notice, cancellation/refund policy, crisis/referral information | **clinical/ethics** + **business owner** | `production only` | (a) Consent copy final versioned: `ConsentRecord.version` reference committed in `docs/consent/consent-v1.md` with eight sections matching JSON `consents` (tujuan, sukarela, kerahasiaan, data, batasan, daring, darurat, persetujuan); (b) clinical/ethics sign-off note attached to `consent-v1.md` frontmatter; (c) privacy notice published page URL + retention period (12 bulan setelah last active service) per `ADR 0083`; (d) cancellation/refund public copy: `"Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."` published on `/booking` confirmation page AND in confirmation email template; (e) crisis boundary text published at footer of every public page per `ADR 0082`; (f) referral list (`referrals` JSON field) populated with at least 3 named referral services with phone/URL; `TBC-CONSENT-01` and `TBC-CANCELLATION-PUBLIC-01` must be closed before evidence can be collected. | `ADR 0082`, `ADR 0083`, `ADR 0084`, `ADR 0085`, `ADR 0086`, `ADR 0076`, `ADR 0077`, Round 3 resolution |
| **G-4** | Verified payment integration and reconciliation behavior | **technical** + **finance** + **operations** | `production only` | (a) Midtrans sandbox test pass log (run-id from CI) showing capture/settlement/expire/refund all green; (b) production merchant activation evidence (Midtrans dashboard screenshot OR signed letter from Midtrans account manager) confirming QRIS + VA enabled; (c) at-least-one successful test refund in sandbox with disbursement confirmation; (d) reconciliation runbook published at `docs/operations/payment-reconciliation.md` covering daily cadence, retry policy, dead-letter escalation; (e) `paid_late` integration test pass (`IMPLEMENTATION-GUIDE.md §7.7`) run-id; (f) duplicate webhook integration test pass (`IMPLEMENTATION-GUIDE.md §7.6`) run-id; (g) finance sign-off confirming account mapping for QRIS/VA receipts vs. Seraya's bank records; (h) `TBC-PAY-01` and `TBC-PAY-EXPIRY-01` must be closed. | `ADR 0088:13-14`, `ADR 0093`, `IMPLEMENTATION-GUIDE.md §7.3–§7.7` |
| **G-5** | Booking confirmation/reminder flow and operational owner | **operations** + **technical** | `before UAT` | (a) Confirmation email template final version committed at `docs/templates/email/booking-confirmation.md` + `payment-confirmation.md` + `reminder-24h.md` + `reminder-2h.md` + `outcome-finalized.md` + `no-show-recorded.md`; (b) UAT scenarios for §13.3 reminder pass with delivery evidence (test email log); (c) Admin WhatsApp number published in `/contact` page footer AND in confirmation email as cancellation/refund channel; (d) on-call runbook at `docs/operations/admin-on-call.md` naming primary + backup Admin + response SLA for payment/booking failure; (e) `TBC-NOTIFY-01` must be closed (provider email, sender domain verification, bounce handling). | `ADR 0052`, `ADR 0088:19`, Round 3 resolution |
| **G-6** | Couple-participant/consent decisions if couple counselling is bookable | **business owner** + **clinical/ethics** + **technical** | `production only` | If business owner chooses **couple launch-deferred** (recommended per `PRD-GUIDELINE-REVIEW.md Round 2 R2-07`): evidence = signed note from business owner + catalog badge `coming soon` verified in §13.3 UAT. No additional artifacts required. If business owner chooses **couple launch-ready**: (a) `BookingParticipant`/`AppointmentParticipant` schema migration applied (D1 migration-id OR Postgres migration-id); (b) `couple_consent` + `participant_consent_a` + `participant_consent_b` + `joint_session_consent` copy finalized and signed by clinical/ethics; (c) notification routing test pass (each participant receives confirmation/reminder for their own appointment only); (d) visibility matrix test pass (partner A cannot read partner B's individual appointment schedule); (e) couple-package cancellation test pass per `ADR 0095 §6`. | `ADR 0090`, `ADR 0095 §6`, `PRD-GUIDELINE-REVIEW.md Round 2 R2-07`, R2-11 |
| **G-7 (matrix §7 plus)** | Architecture / persistence stack ratified | **technical** | `before slice 0` | `ADR 0089-architecture-worker-d1.md` accepted; `migrations/0001_init.sql` applied to D1 binding; backup/restore runbook at `docs/operations/d1-backup-restore.md`; environment variables for D1 binding listed in `wrangler.toml` (committed). | `ADR 0089`, `PRD-GUIDELINE-REVIEW.md Round 1 P0-01` |
| **G-8 (matrix §7 plus)** | Booking intake, minor (16–17) guardian route, eligibility boundary, cutoff | **business owner** + **clinical/ethics** + **technical** | `before slice 2` | `ADR 0094-intake-eligibility-cutoff.md` accepted; booking intake schema applied (D1 migration-id); JSON `booking_intake` updated to match `ADR 0094` field list; cutoff = `1 hour before scheduled_start` enforced in `CreateBooking` precondition (integration test pass run-id). | `ADR 0094`, `PRD-GUIDELINE-REVIEW.md Round 1 P0-04`, `Ticket 09` |
| **G-9 (matrix §7 plus)** | No-show timing, late-arrival correction window | **clinical/ethics** + **operations** + **technical** | `before UAT` | `ADR 0092-appointment-outcome-timing.md` accepted; T+15m auto-checkpoint cron handler deployed to Worker; `OutcomeCorrection` 7×24h window enforced by `ADR 0092 §6.1.3` (integration test pass run-id covering in-window vs out-of-window). | `ADR 0092`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-12` |
| **G-10 (matrix §7 plus)** | Package-wide cancellation matrix + outcome race | **operations** + **technical** | `before UAT` | `ADR 0095-package-cancellation-matrix.md` accepted; D1/Postgres triggers applied (migration-id); 15 acceptance criteria tests pass run-id; couple-package target resolution per `ADR 0095 §6` test pass. | `ADR 0095`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-13`, `Ticket 10` |
| **G-11 (matrix §7 plus)** | Payment settlement uniqueness + `paid_late` package | **technical** + **finance** | `production only` (paired with G-4) | Unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` applied (D1/Postgres migration-id); `paid_late` test (`IMPLEMENTATION-GUIDE.md §7.7`) pass run-id; duplicate webhook test (`IMPLEMENTATION-GUIDE.md §7.6`) pass run-id; finance sign-off confirming reconciliation report uses `Payment.settled_at` as canonical truth. | `ADR 0093`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-10` |
| **G-12 (matrix §7 plus)** | Two-Admin bootstrap + last-active-Admin guard | **business owner** + **operations** + **technical** | `before UAT` | (a) `StaffMembership` rows for both bootstrap Admins with `RoleAssignment.role = 'admin'` and `is_active = true` (D1 query result); (b) last-active-Admin guard implementation per `PRD-GUIDELINE-REVIEW.md Round 1 P1-11 required correction` (cannot revoke the only remaining active Admin without another Admin present — integration test pass run-id); (c) Google SSO configured per `ADR 0080` (OAuth client_id/secret in secret store, redirect URIs registered). | `ADR 0080`, `ADR 0081`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-11` |
| **G-13 (matrix §7 plus)** | UAT pass for recorded critical scenarios | **operations** + **technical** + **business owner** | `production only` | (a) UAT scenarios from `IMPLEMENTATION-GUIDE.md §13.3` recorded as pass with screenshots + run-ids: four program pillars public; counseling online/offline catalog + package pricing; guest booking + hold expiry; payment success/failure/late webhook; package next-session scheduling; Admin cancellation approve/deny and separate refund; staff role visibility; mobile keyboard/focus/contrast/error states; privacy/no-clinical-data boundary; (b) accessibility/perf/SEO checks per `PRD-GUIDELINE-REVIEW.md Round 1 P1-06` measurable acceptance (Lighthouse scores committed); (c) business owner walkthrough sign-off. | `IMPLEMENTATION-GUIDE.md §13.3`, `ADR 0088:12`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-06` |
| **G-14 (matrix §7 plus)** | Operational sign-off (consolidated) | **business owner** + **operations** + **clinical/ethics** + **finance** + **technical** | `production only` | Consolidated sign-off document at `docs/launch/release-sign-off-v1.md` listing G-1..G-13 status (pass/blocked/waived) with each owner's signature (typed name + role + date) and attached evidence links. No "TBD" cells. Waivers require explicit business owner acknowledgement. | this ADR §3 |

### §4. Gate-to-TBC dependency map

To make the checklist executable, this section enumerates every TBC that still blocks one or more gates. Closing each TBC is the **prerequisite** for collecting the related evidence; the TBC is not closed until the evidence artifact exists.

| TBC | Blocks gate | Closure action |
|---|---|---|
| `TBC-CONSENT-01` | G-3 | Sign off clinical/ethics on consent copy final; commit `ConsentRecord.version`. |
| `TBC-PRIVACY-01` | G-3 | Decide retention policy values; document execution cadence; redact test fixtures. |
| `TBC-PAY-01` | G-4 | Method codes, fees, limits, refund capability documented; adapter config committed. |
| `TBC-PAY-EXPIRY-01` | G-4 | Provider expiry vs SlotHold TTL invariant decided; integration test pass. |
| `TBC-NOTIFY-01` | G-5 | Email provider + sender/domain verification + bounce handling + reminder offsets committed. |
| `TBC-REC-01` | G-4, G-11 | Reconciliation cadence and dead-letter policy committed. |
| `TBC-ADMIN-01` | G-12, G-5 | Admin workspace fields/visibility matrix committed; last-active-Admin guard tested. |
| `TBC-ACCESS-01` | G-12 | ClientAccess rate limit/recovery/revocation decided; conservative defaults applied. |
| `TBC-STAFF-SESSION-01` | G-12 | OAuth state/nonce/session/cookie/CSRF/re-auth/revocation/recovery behavior committed. |
| `TBC-COUPLE-LAUNCH-01` | G-6 | Business owner decides couple launch-deferred (default) vs launch-ready; evidence follows. |
| `TBC-SCHEDULE-01` | G-2 | Fuja recurring schedule + offline venue confirmed; AvailabilityRule populated. |
| `TBC-API-01` | G-13 | Transport routes/payloads defined; UAT scenarios reference real endpoints. |
| `TBC-LIVE-PRD-01` | G-13, G-14 | Live form reconciled with closure baseline; missing canonical keys restored or removed. |
| `TBC-EXTENSION-01` | G-9, G-10 | `extension_request` / `extension_grant` audited commands added to `ADR 0092 §6.1.3` and `ADR 0095 §3`. |

### §5. Patches to `IMPLEMENTATION-GUIDE.md §16`

The current `IMPLEMENTATION-GUIDE.md §16` (lines 910–925) lists gates as a single bullet list without owner/blocking-stage/evidence. This ADR mandates the patch described below (carried out as part of closing `Ticket 07`):

- Replace the narrative bullet list with a table whose columns are: `#`, `Gate`, `Owner`, `Blocking stage`, `Acceptance evidence (artifact path/URL/record-id)`, `Source ADR/TBC`.
- Add a `PRD/design handoff checklist` subsection (§16.1) restating §2 of this ADR.
- Add a `Production-launch checklist (Matrix §7)` subsection (§16.2) restating §3 of this ADR.
- Add a `Gate-to-TBC dependency map` subsection (§16.3) restating §4 of this ADR.
- Add a `Release sign-off template` subsection (§16.4) referencing `docs/launch/release-sign-off-v1.md` and listing required signatures.
- The patch must preserve the existing top-line statement: "PRD/design handoff can proceed now using this document and explicit placeholders. Production launch requires passing every gate below with acceptance evidence attached."

### §6. Patches to `PRD-GUIDELINE-REVIEW.md`

This ADR mandates:

- Move `TBC-LAUNCH-GATE-DETAIL-01` from "Still open" to "Closed by Round 7 (Ticket 07)" with closure evidence pointing to this ADR (§3 gate table) + `IMPLEMENTATION-GUIDE.md §16` patch.
- Update the Round 5 verdict to note that `TBC-LAUNCH-GATE-DETAIL-01` is closed.

### §7. Open follow-ups

- The 14 remaining open TBCs in `PRD-GUIDELINE-REVIEW.md Round 5` (`TBC-PAY-EXPIRY-01`, `TBC-STAFF-SESSION-01`, `TBC-ACCESS-01`, `TBC-ADMIN-01`, `TBC-API-01`, `TBC-REC-01`, `TBC-LIVE-PRD-01`, `TBC-POLICY-RECONCILE-01`, `TBC-CHANNELS-MODEL-01`, `TBC-COUPLE-LAUNCH-01`, `TBC-PERSONA-FIELDS-01`, `TBC-PROFILE-EXPORT-01`, `TBC-STORY-VOICE-01`, `TBC-PAY-01`, `TBC-NOTIFY-01`, `TBC-CONSENT-01`, `TBC-EXTENSION-01`) remain open until their evidence artifact exists per §4 dependency map. This ADR does not close them.
- If the business owner changes couple-launch status after this ADR is accepted, §3 G-6 must be re-evidenced (no ADR amendment required; only the sign-off document is updated).
- If `TBC-LIVE-PRD-01` reconciliation produces a different canonical value for any gate, the gate evidence must be regenerated; ADR amendment required.
- Live launch can only proceed after `G-14` consolidated sign-off is signed and every G-1..G-13 gate is `pass` or explicitly `waived` by the business owner.

## Consequences

### Positive

- Owner sign-off becomes auditable: each gate has a named role and an artifact (path, URL, or signed record).
- The PRD/design handoff vs production launch distinction is explicit; the common misconception "PRD done = launch ready" is structurally prevented.
- The Matrix §7 six gates become the **single source of truth** for launch readiness; subsequent ADR additions (settlement uniqueness, no-show timing, intake/cutoff, package cancellation, couple participant) are folded in as `matrix §7 plus` rows, so the checklist grows in one place.
- The TBC register and the gate checklist stay synchronized: every TBC declares which gate it blocks, so closing a TBC immediately updates the checklist.
- Release manager (operations) can collect evidence using a fixed template (`docs/launch/release-sign-off-v1.md`); business owner reviews a single document with attached links instead of free-form narrative.

### Costs and constraints

- 14 TBCs remain open and must be closed before their respective gate evidence can be collected. The team must execute the §4 dependency map systematically; partial closure (e.g. consent copy signed but privacy notice not published) does not satisfy G-3.
- Each gate evidence requires a concrete artifact. TBCs that close via "we agreed in chat" cannot be used as evidence; this means the team must produce files (`docs/consent/consent-v1.md`, `docs/operations/payment-reconciliation.md`, `docs/launch/release-sign-off-v1.md`, etc.) and run integration tests with run-ids.
- The couple-launch decision (G-6) forces the business owner to make an explicit choice before launch. If the owner defers couple, G-6 evidence is short (sign-off note); if the owner enables couple, G-6 evidence requires the full `ADR 0090` + `ADR 0095 §6` artifacts.
- Adding new gates (e.g. if a future ADR introduces a new release-gate requirement) requires amending this ADR and re-running the sign-off; the table format is the right shape but it must remain owner-by-owner.

## Acceptance criteria (Ticket 07 closure)

1. `IMPLEMENTATION-GUIDE.md §16` is patched with §5 owner/blocking-stage/evidence table — **PASS** (patch executed as part of this ticket).
2. Owner-by-owner sign-off table exists — **PASS** (§3 columns `Owner (named role)` and `Acceptance evidence (artifact)`).
3. Each gate has owner, blocking stage, acceptance evidence — **PASS** (§3 table columns).
4. PRD/design handoff checklist separate from production launch checklist — **PASS** (§2 vs §3).
5. `PRD-GUIDELINE-REVIEW.md` `TBC-LAUNCH-GATE-DETAIL-01` row moved to "Closed by Round 7 (Ticket 07) / `ADR 0096`" — **PASS** (patch executed as part of this ticket).

## Related

- `ADR 0088-prd-handoff-production-gate.md` — PRD-handoff vs production-launch distinction (lifted into §2 and §3).
- `ADR 0089-architecture-worker-d1.md` — G-7.
- `ADR 0090-couple-participant-model.md` — G-6 (if launch-ready).
- `ADR 0091-capacity-overlap-buffer.md` — referenced from G-2/G-13.
- `ADR 0092-appointment-outcome-timing.md` — G-9.
- `ADR 0093-payment-settlement-uniqueness.md` — G-11 + G-4 evidence.
- `ADR 0094-intake-eligibility-cutoff.md` — G-8.
- `ADR 0095-package-cancellation-matrix.md` — G-10.
- `IMPLEMENTATION-GUIDE.md §16` — patched target.
- `PRD-GUIDELINE-REVIEW.md Round 2 R2-13` — source finding.
- `Ticket 07 — Launch-gate executable checklist.md` — closure ticket.
