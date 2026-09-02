# Seraya Psikologi — Implementation Guide

## Status

**Implementation Baseline — boleh dipakai sebagai pegangan implementasi.**

Source baseline:

- Technical PRD canonical closure baseline: revision `168`
- Non-technical PRD closure baseline: revision `46`
- Domain model: `DOMAIN-MODEL.md`
- Decision history: `docs/adr/0001–0097`
- Live endpoint may advance beyond the baseline; this guide describes implementation intent, while `docs/WORKBOARD.md` and `docs/prd/` describe the current project status and launch path.

Dokumen ini sengaja tidak menunggu semua jawaban pada dua PRD form. Keputusan yang sudah confirmed menjadi aturan implementasi. Hal yang belum diputuskan ditulis sebagai `TBC` dan harus diisolasi di configuration/adapter/policy seam, bukan ditebak sebagai keputusan bisnis.

## 1. Cara membaca dokumen ini

### 1.1 Authority order

Jika terjadi perbedaan:

1. Accepted ADR terbaru;
2. bagian canonical pada Technical PRD revision 168;
3. dokumen ini;
4. catatan/open question lama.

Jika konflik belum terselesaikan, jangan memilih diam-diam. Buat `TBC` atau blocker ticket dan minta keputusan owner.

### 1.2 Label

- **CONFIRMED** — boleh diimplementasikan sekarang.
- **TBC** — belum diputuskan; implementasikan seam/default teknis yang reversible saja.
- **DEFERRED** — sengaja tidak masuk MVP.
- **PRODUCTION GATE** — tidak memblokir PRD/design handoff, tetapi memblokir live launch.

### 1.3 Prinsip utama

- Jangan menyimpan clinical notes, diagnosis, assessment result, transcript, session notes, atau crisis narrative.
- Jangan mengubah Payment, Appointment, OfferSnapshot, PackagePurchase, atau historical record in-place untuk merepresentasikan perubahan historis.
- Browser redirect bukan payment truth.
- Semua command yang menerima retry harus idempotent.
- Semua perubahan privileged harus audited.
- WhatsApp adalah optional manual support, bukan workflow state machine.
- `TBC` tidak boleh menjadi nilai production yang tidak terlihat; placeholder harus ditandai dan production publication harus gated jika diperlukan.

## 2. Launch scope

### 2.1 In scope — CONFIRMED

- Public marketing dan empat program pillar:
  - SERAYA PULANG
  - SERAYA BERDAYA
  - SERAYA BERSAMA
  - SERAYA BERBAGI
- Hanya **SERAYA PULANG** yang bookable/paid pada launch.
- Layanan launch: **Konseling Psikologi**.
- Psychological assessment: deferred.
- Counseling online dan offline.
- Durasi sesi standar: 60 menit.
- Individual counseling:
  - online single: Rp125.000;
  - online 2 sesi: Rp235.000;
  - online 3 sesi: Rp345.000;
  - offline single: Rp200.000;
  - offline 2 sesi: Rp380.000;
  - offline 3 sesi: Rp555.000.
- Couple counseling:
  - 3 meeting dengan sequence A/B/joint;
  - online: Rp350.000;
  - offline: Rp550.000.
- Package dibayar penuh di muka.
- Fuja Rahayu Kinanti adalah satu-satunya psikolog launch yang confirmed; melayani individual dan couple counseling.
- Guest booking tanpa akun penuh.
- Optional UserAccount/Google linking untuk client tetap terpisah dari staff access.
- Email adalah automated channel utama.
- **WhatsApp manual payment adalah launch path** (PDF + plain text invoice, Admin "Mark as paid"). Tidak ada payment gateway di launch (`ADR 0097`); Midtrans deferred post-MVP (`ADR 0068` superseded).
- Payment method launch: `bank_transfer`, `va`, `qris_manual` — semuanya off-platform settlement.
- Cloudflare Worker + D1 adalah implementation baseline proyek saat ini.

### 2.2 Out of scope — DEFERRED

- Clinical record/EMR.
- Diagnosis, assessment result, treatment/session notes.
- Crisis intake, triage, risk scoring, atau case management.
- Client self-service cancellation/refund.
- Partial monetary refund.
- Package installment.
- Automatic transfer package ke psikolog lain.
- Multi-gateway/failover.
- E-wallet, card, OTC, BNPL, direct debit, dan payment method lain.
- Editor sebagai active staff role.
- Automated WhatsApp provider/lifecycle.
- Marketing campaign automation.

## 3. Actors and authorization

### 3.1 Active roles — CONFIRMED

| Role | Scope |
|---|---|
| Visitor | Public pages, catalog, program content, published availability |
| Client/Guest | Own verified Booking/PackagePurchase melalui scoped ClientAccess |
| Psychologist | Own profile/availability input, assigned operational appointments, initial completed/no_show |
| Admin | Operational owner: catalog, availability override, booking, payment/refund, cancellation, privacy, staff, audit |
| Editor | DEFERRED; jangan aktifkan di launch |

### 3.2 Staff authentication — CONFIRMED

- Google SSO only.
- Google authentication atau domain match tidak otomatis memberikan staff access.
- Staff harus di-invite/allowlist oleh Admin.
- Staff harus memiliki active `StaffMembership`/`RoleAssignment`.
- Staff tidak boleh memilih role sendiri.
- Bootstrap dengan dua Admin.
- Kedua Admin dapat invite/revoke staff.
- Tidak ada shared account, password fallback, atau undocumented bypass.

### 3.3 ClientAccess — CONFIRMED baseline

- Email-primary one-time magic link/OTP.
- Token berlaku 15 menit.
- Scoped session berlaku 30 menit.
- Resend menginvalidasi token lama.
- Plaintext token tidak boleh disimpan atau dilog.
- Access hanya ke verified Booking/PackagePurchase terkait.
- ClientAccess tidak dapat melakukan self-service cancellation/refund.
- ClientAccess tidak dapat enumerate record lain.

**TBC-ACCESS-01:** rate limit detail, recovery flow, re-authentication, session revocation, dan abuse response. Isolasi di `ClientAccessPolicy`/`SessionPolicy`; jangan campur dengan domain Booking.

## 4. Domain model minimum

Implementasi awal harus memiliki boundary/module untuk entity berikut. Nama tabel boleh berbeda, tetapi vocabulary domain harus dipertahankan.

### 4.1 Catalog and capacity

- `PsychologistProfile`
- `Service`
- `ServiceOffering`
- `ServiceOfferingRevision` — immutable published configuration
- `ServicePackage`
- `AvailabilityRule`
- `AvailabilityException`
- `AvailabilitySlot`
- `SlotHold`

### 4.2 Transaction and service delivery

- `Client`
- `UserAccount` — optional client login
- `Booking`
- `OfferSnapshot`
- `Appointment`
- `PackagePurchase`
- `SessionEntitlement`
- `AppointmentOutcome`
- `OutcomeCorrection`
- `RescheduleAction`

### 4.3 Financial and policy records

- `Payment`
- `PaymentEvent`
- `RefundAction`
- `CancellationRequest`
- `CancellationDecision`
- `ConsentRecord`
- `PrivacyRequest`
- `RetentionPolicy`
- `AuditRecord`

### 4.4 Access, content, and notifications

- `StaffMembership`
- `RoleAssignment` jika dipisahkan dari membership
- `ContentEntry`
- `ContentRevision`
- `Notification`
- `DeliveryAttempt`
- `ReminderSchedule`

## 5. Module seams

Implementasi boleh berupa satu Worker/modular monolith. Jangan membocorkan detail provider atau SQL ke semua caller. Gunakan module interface yang dalam dan kecil.

### 5.1 Required modules

- `CatalogModule`
  - published offerings, revisions, packages, snapshots;
  - tidak mengubah purchase history.
- `AvailabilityModule`
  - rules, exceptions, slot generation, slot withdrawal, hold expiry;
  - tidak mengubah booked/historical capacity.
- `BookingModule`
  - create booking, snapshot, hold, confirmation, expiry, appointment linkage.
- `PackageModule`
  - purchase, ordered entitlements, consume/restore/expire.
- `PaymentModule`
  - manual payment proof, invoice generation, Admin verification, idempotency.
  - Midtrans/payment gateway is deferred; do not add provider behavior to the MVP.
- `CancellationModule`
  - request, approve/deny, atomic appointment/slot/entitlement effect.
- `RefundModule`
  - separate full/no-refund action, provider call, retry/reconciliation.
- `AccessModule`
  - ClientAccess dan staff membership authorization.
- `PrivacyModule`
  - consent, PrivacyRequest, retention/redaction/pseudonymization.
- `NotificationModule`
  - email, delivery attempts, reminder scheduling.
- `AuditModule`
  - append-only privileged/domain audit events.

### 5.2 Minimum command interface

Transport route dan exact payload shape adalah **TBC-API-01**. Command semantics berikut sudah confirmed:

- `CreateBooking`
- `CreateSlotHold`
- `CreatePaymentIntent`
- `ApplyVerifiedPaymentEvent`
- `ExpireSlotHold`
- `ReconcileLatePayment`
- `CreatePackagePurchase`
- `ScheduleNextEntitlement`
- `ConsumeEntitlement`
- `RestoreEntitlement`
- `RequestCancellation`
- `DecideCancellation`
- `ExecuteRefundAction`
- `CreateReplacementAppointment`
- `RegenerateFutureAvailability`
- `RequestPrivacyAction`
- `RedactClientContact`
- `AssignOrRevokeStaffMembership`

Setiap command harus menerima atau menghasilkan:

- `commandId`/idempotency key;
- actor atau system actor;
- correlation ID;
- target aggregate/reference;
- version/precondition jika ada concurrency concern;
- audit result;
- typed failure yang dapat dipetakan ke API/UI.

## 6. State machines and invariants

### 6.1 Booking and Appointment — CONFIRMED

```text
Create Booking
  → pending_payment + SlotHold(active)
  → confirmed hanya setelah verified PaymentEvent(success)

Payment/hold failure
  → expired | failed

Hold expiry + later verified success
  → Payment=paid_late/reconciliation-required
  → reacquire original slot atomically jika masih free
  → jika tidak free: no automatic alternate Appointment
```

Invariants:

- SlotHold default TTL: 10 menit.
- Payment success dari browser redirect tidak cukup untuk confirm.
- OfferSnapshot menyimpan price/mode/duration yang dipakai transaksi.
- Confirmed Appointment tidak diedit in-place untuk reschedule.
- Reschedule membuat replacement Appointment; Appointment lama menjadi `rescheduled`.
- Historical Appointment tidak dihapus.

#### 6.1.1 Appointment state machine — CONFIRMED (ADR 0092)

```text
confirmed
  → (auto, T+15m, no client_arrived) → no_show        [entitlement consumed, checkpoint locked]
  → (client_arrived ≤ T+15m) → in_progress              [auto-checkpoint cancelled]
  → (client_arrived > T+15m) → in_progress              [auto-checkpoint already locked; outcome_final = no_show_late]
  → (CancellationDecision approve) → cancelled          [entitlement restored jika valid]

in_progress
  → (session_ended ≥ 60m attended) → completed          [entitlement consumed]
  → (session_ended 1–59m attended) → completed_partial  [entitlement consumed; compensation token eligible]
  → (CancellationDecision approve) → cancelled          [entitlement restored jika valid]
```

Final outcome enum (lima nilai):

| Outcome | Trigger | Entitlement | Notification |
|---|---|---|---|
| `completed` | psikolog/Admin, end-of-session, attended ≥60m | consumed | email `outcome_finalized` |
| `completed_partial` | psikolog/Admin, end-of-session, attended 1–59m | consumed | email `outcome_finalized` |
| `no_show` | system auto T+15m, atau psikolog/Admin override | consumed | email `no_show_recorded` + admin alert |
| `no_show_late` | psikolog/Admin, client_arrived > T+15m dan sesi berjalan ≥1m | consumed | email `outcome_finalized` |
| `cancelled` | CancellationDecision approve | restored jika valid | sesuai cancellation flow |

#### 6.1.2 Late-arrival handling — CONFIRMED (ADR 0092)

- Klien yang datang terlambat tetap diterima. Psikolog atau Admin merekam event `client_arrived` (server timestamp, via Admin workspace).
- Jika `client_arrived_at <= scheduled_start + 15m`: auto-checkpoint `no_show` di-batalkan; outcome final ditentukan di end-of-session (`completed` atau `completed_partial`).
- Jika `client_arrived_at > scheduled_start + 15m`: auto-checkpoint `no_show` sudah locked; event arrival dicatat sebagai informational; outcome final `no_show_late` jika sesi berjalan ≥1m.
- Durasi attended dihitung dari `client_arrived_at` (atau `scheduled_start` jika on-time) sampai `session_ended_at`.
- Klien tidak dapat self-mark `client_arrived` di launch; tidak ada UI client untuk arrival (TBC-CLOCK-01).

#### 6.1.3 Outcome correction — CONFIRMED (ADR 0092, ADR 0054)

- Admin boleh membuat `OutcomeCorrection` event hingga **7×24 jam (7 hari kalender)** dari `marked_at` original outcome (Asia/Jakarta).
- Setelah window: outcome immutable. Perubahan hanya via `CancellationDecision` baru atau explicit Admin extension (TBC-EXTENSION-01, di luar scope).
- `OutcomeCorrection` membawa: original_outcome, new_outcome, reason_category, reason_text (max 200 char, non-klinis), actor_admin_id/email, marked_at_correction, entitlement_delta, refund_action_required, correction_window_deadline_at.
- Original outcome tetap immutable history. Correction adalah append-only event.
- Duplicate correction dengan idempotency_key yang sama: return existing event, no side effect.
- Koreksi berurutan dalam window: koreksi kedua merujuk ke hasil koreksi pertama (lineage chain via `previous_correction_id`).
- Entitlement adjustment: koreksi yang me-restore entitlement (`no_show → completed*`) menghitung delta +1; sebaliknya -1; applied atomically dengan correction event.

#### 6.1.4 Notification templates untuk outcome events

- `no_show_recorded` — email ke klien saat T+15m auto-checkpoint.
- `no_show_admin_alert` — in-app + email ke Admin saat T+15m auto-checkpoint.
- `client_arrived_admin` — in-app Admin saat late arrival dicatat.
- `outcome_finalized` — email ke klien saat psikolog/Admin menandai final outcome (`completed`, `completed_partial`, `no_show_late`).
- `outcome_finalized_admin` — email + in-app Admin saat Admin override marking.
- `outcome_corrected` — email ke klien saat `OutcomeCorrection` dalam window 7 hari.
- `correction_window_expired` — in-app Admin saat attempt koreksi lewat window (ditolak).

### 6.2 Package and entitlement — CONFIRMED (ADR 0092, ADR 0095)

- Package dibayar penuh di muka.
- Verified payment success membuat `PackagePurchase` dan ordered `SessionEntitlement`.
- First Appointment dapat dikonfirmasi bersama purchase.
- Entitlement dikonsumsi oleh outcome `completed`, `completed_partial`, `no_show` (T+15m auto-checkpoint, ADR 0092), dan `no_show_late` (late arrival but session held). Hanya `cancelled` (via CancellationDecision approve) yang tidak mengonsumsi.
- `no_show` adalah **early operational checkpoint** yang terkunci pada T+15 menit dari scheduled start (`Asia/Jakarta`) selama Appointment masih `confirmed` dan belum ada `client_arrived` event; entitlement ter-konsume di checkpoint. Sesi yang baru mulai setelah T+15 tetap dilayani dan outcome akhirnya `no_show_late` (entitlement tetap consumed). Definisi lengkap ada di ADR 0092 §6.1.1–§6.1.3.
- Entitlement dijadwalkan sequentially.
- Cancellation yang approved dapat restore entitlement yang masih valid (lihat `cancelled` di atas dan ADR 0095 §3 atomic effects).
- Restore mempertahankan original sequence dan expiry.
- Entitlement expired tidak otomatis diperpanjang atau di-reset.
- OutcomeCorrection dalam window 7×24 jam (`ADR 0092 §6.1.3` + `ADR 0054`) dapat me-restore atau me-reconsume entitlement via `OutcomeCorrection` atomically. Lewat window: outcome immutable.
- **Cancellation matrix untuk `PackagePurchase`/`SessionEntitlement`/`Appointment`/`Booking` adalah kanonik di `ADR 0095-package-cancellation-matrix.md`. Aturan §6.3 di bawah adalah ringkasan operasional; matrix lengkap (target types, open-request invariant, pending-vs-outcome race R1–R4, atomic package-wide effects, partial-package 1-of-N, repeat/correction, couple-package override, `RescheduleAction` table) ada di sana.**

**TBC-PACKAGE-01:** exact package validity/expiry calendar semantics, reminder offset, dan package availability resolution SLA. Simpan policy sebagai snapshot pada `PackagePurchase`; jangan membaca ulang catalog saat entitlement lama diproses.

### 6.3 Cancellation — CONFIRMED

Canonical matrix lives in `ADR 0095-package-cancellation-matrix.md`. Ringkasan operasional:

```text
Admin WhatsApp (public channel)
  → CancellationRequest (at most one open per target; ADR 0095 §1.2)
  → state: open
  → race resolution per ADR 0095 §2:
      R1: outcome completed lands first  → request auto_resolved
      R2: outcome no_show lands first     → request auto_resolved
      R3: approval lands first            → outcome marking blocked afterwards
      R4: RescheduleAction lands          → request rebinds to replacement
  → Admin approve | deny (DecideCancellation)

approve atomically (per target; see ADR 0095 §3):
  target = appointment:
    Appointment → cancelled
    CapacityReservation → cancelled (release_reason = appointment_cancelled)
    linked SessionEntitlement → restored if valid, else closed
    eligible future slot → available

  target = package_purchase (single transaction):
    all future non-terminal Appointments → cancelled
    all CapacityReservations for those Appointments → cancelled
    all unused SessionEntitlements with valid_until >= now → closed_restored_by_cancellation
    all other unused SessionEntitlements → closed_cancelled_with_package
    PackagePurchase.state → closed_by_cancellation (terminal, no re-open)
    PackageValidity.valid_until unchanged
    consumed/expired entitlements untouched (refund is separate)

  target = booking (single-session single-Appointment):
    identical to target = appointment

den y:
  no mutation to Booking/Appointment/slot/entitlement/Payment

correction (repeat rule, ADR 0095 §4):
  new CancellationRequest with correction_of = previous_decision_id
  new Decision applies §3 effects afresh (idempotent on already-cancelled)
  original Decision marked superseded_by, remains immutable history
```

- Tidak ada automatic cancellation cutoff pada launch.
- Pending tidak release slot.
- Tidak ada separate `Release Slot` command/button.
- Cancellation decision dan refund action adalah record/action terpisah (`full_refund`/`no_refund` only, `ADR 0063`/`0077`).
- One Admin boleh melakukan keduanya secara terpisah (`ADR 0078`).
- Couple-package cancellation menggunakan `BookingParticipant` rows (`ADR 0090`) dan matrix §6 dari `ADR 0095`; withdrawal mid-session bukan cancellation path (tetap `OutcomeCorrection`/`AppointmentOutcome`).
- `RescheduleAction` transition table (canonical) lives at `ADR 0095 §5`; original Appointment → `rescheduled`, replacement Appointment created, source state must be `scheduled`/`confirmed` (forbidden after `completed`/`no_show`/`cancelled`).
- Semua action audited dan append-only.

### 6.4 Refund — CONFIRMED

- Launch outcomes hanya `full_refund` atau `no_refund`.
- Partial monetary refund deferred; tiered or admin-defined amounts live in the Admin WhatsApp conversation log, not in the booking product.
- Refund tidak mengubah Payment history in-place.
- RefundAction terhubung ke original Payment dan, bila relevan, approved CancellationDecision.
- Full refund tidak boleh melebihi captured amount.
- Retry harus idempotent.
- Refund failure menjadi reconciliation/manual-resolution state, bukan silent success.
- Public website tidak menyediakan UI cancellation atau refund; copy yang ditampilkan: "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."

### 6.5 Availability — CONFIRMED

- Timezone canonical: `Asia/Jakarta`.
- Booking horizon: rolling 90 hari.
- Transition buffer: 15 menit.
- AvailabilityRule/Exception hanya memengaruhi future unheld/unbooked slots.
- Held/booked/historical records dipertahankan.
- Invalid future unheld slot menjadi withdrawn/unavailable, bukan dipindahkan diam-diam.
- Fuja `anytime/anyplace` hanya placeholder PRD/design.
- Production slot publication wajib menunggu schedule/location nyata.

## 7. Payment implementation — WhatsApp manual flow (per `ADR 0097`)

Launch path tidak menggunakan payment gateway. Klien menerima invoice PDF + plain text via WhatsApp, membayar manual (bank transfer / VA / QRIS), mengirim bukti ke Admin WhatsApp, dan Admin menandai Booking sebagai paid via tombol "Mark as paid" di Admin workspace. Refund tetap off-platform (`ADR 0077` vocabulary). Midtrans Snap deferred post-MVP (`ADR 0068` superseded).

### 7.0 Launch payment model — CONFIRMED (per `ADR 0097`)

- **Tidak ada payment gateway.** Klien membayar manual ke rekening / VA / QRIS Seraya. Invoice diberikan via WhatsApp dalam format PDF (downloadable) dan plain text (untuk share).
- **Booking state machine (payment-relevant)**: `pending_manual_payment` → `awaiting_confirmation` → `confirmed` (mark-as-paid) → `cancelled`.
- **Admin verification**: tombol "Mark as Paid" di Admin workspace. Command `MarkAsPaid` menerima `payment_method`, `amount_idr`, `evidence_url` (nullable), `evidence_note` (nullable), dan atomic-insert `payment_proof` row + update `Payment.status = 'paid'` + `Booking.status = 'confirmed'` + outbox event dalam satu transaction.
- **`payment_proof` table** (append-only): fields `id`, `booking_id`, `payment_method` (`bank_transfer` | `va` | `qris_manual`), `amount_idr`, `evidence_url`, `evidence_note`, `verified_by_membership_id`, `verified_at`, `status` (`verified` | `rejected`), `correction_of` (nullable). Re-verify path: Admin reject existing row + create new row dengan `correction_of` linkage; original immutable.
- **Audit trail**: setiap state change logged ke `audit_record` dengan `actor_membership_id`, `before_state`, `after_state`, `reason_code`, `timestamp`. Tidak ada rewrite in-place.
- **Settlement uniqueness invariant tetap berlaku** (`ADR 0093 §1.2`): unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` + application-level precheck di `MarkAsPaid` handler.
- **Refund**: `RefundAction` `full_refund` / `no_refund` per `ADR 0077`; `provider_reference = "manual_bank_transfer:<date>:<admin_ref>"`; `status` transitions `pending → completed` (Admin confirms off-platform transfer) atau `failed`.

### 7.1 Invoice generation — CONFIRMED

Invoice adalah **immutable output** per Booking, generated on-demand dari `OfferSnapshot` + payment instructions di Admin CMS config. Dua format tersedia:

#### 7.1.1 PDF invoice

Server-side rendered via template engine (puppeteer / pdfkit / equivalent). Fields:

- `invoice_id`: `INV-<booking_id>`
- `issued_at`: ISO 8601 Asia/Jakarta
- `due_at`: `issued_at + 24h`
- `client_name`, `client_email`
- `booking_id`
- `service_offering_name`, `mode` (`online` | `offline`), `sessions` (`1` | `2` | `3` | `couple-3`)
- `amount_idr` (integer, formatted sebagai `Rp X.XXX.XXX`)
- `payment_instructions`: dari Admin CMS config (`bank_transfer` → `bank_name`/`account_number`/`account_holder`; `va` → `va_number`; `qris_manual` → `qris_image_url`)
- `support_whatsapp`: `wa.me/<admin_number>`
- `disclaimer`: "Pembayaran akan dikonfirmasi dalam 1 hari kerja setelah bukti diterima."

**Tidak termasuk**: clinical information, contact phone (jika ada), BookingParticipant detail untuk couple — hanya identitas payer.

PDF di-cache per `booking_id`. Signed URL dengan retention mengikuti Booking (12 bulan setelah last active service, `ADR 0083`). Regen hanya jika `OfferSnapshot` berubah (tidak seharusnya — snapshot immutable).

#### 7.1.2 Plain text invoice

Static template dengan field substitution. Format WhatsApp-friendly (markdown lite: `*bold*`, list):

```
*SERAYA PSIKOLOGI — INVOICE*

Invoice ID: INV-<booking_id>
Issued: <YYYY-MM-DD HH:mm WIB>
Due: <YYYY-MM-DD HH:mm WIB> (24 jam)

Client: <client_name>
Email: <client_email>
Booking ID: <booking_id>
Service: <service_offering_name>
Mode: <online|offline>
Sessions: <1 | 2 | 3 | couple-3>
Amount: Rp <amount formatted>

*Payment Instructions*
Method: <bank_transfer|va|qris_manual>
<bank_name>: <account_number>
a/n: <account_holder>
<VA number>  (jika applicable)
<QRIS image: <url>>  (jika applicable)

Setelah membayar, mohon kirim bukti transfer ke WhatsApp Admin: wa.me/<admin_number>

Pembayaran akan dikonfirmasi dalam 1 hari kerja.
```

#### 7.1.3 Generation rules

- Endpoint: `GET /api/booking/{booking_id}/invoice.pdf` (PDF) dan `GET /api/booking/{booking_id}/invoice.txt` (plain text).
- Authorization: ClientAccess scoped ke Booking (self-service) **atau** Admin session.
- Idempotent: regenerating invoice tidak membuat side effect; output deterministik untuk input yang sama.
- Payment instructions di Admin CMS config — **bukan hardcode**. Admin mengelola via `Admin CMS → Payment Settings`. Default fallback saat kosong: tampilkan error "Payment instructions not configured. Hubungi Admin." (graceful failure).
- Retention: PDF di-object storage dengan retention policy 12 bulan; auto-delete setelah retention expiry per `ADR 0083` + `IMPLEMENTATION-GUIDE.md §9`.

#### 7.1.4 Invoice buttons di client confirmation page

- **Download Invoice (PDF)** — link ke signed URL PDF.
- **Copy Invoice Text** — copy plain text ke clipboard client.
- **Kirim via WhatsApp** — `wa.me/<admin_number>?text=<url_encoded_plain_text_invoice>` deep link.

### 7.2 Mark-as-paid workflow (Admin workspace) — CONFIRMED

#### 7.2.1 `MarkAsPaid` command

| Aspect | Spec |
|---|---|
| Input | `booking_id`, `payment_method` (`bank_transfer` \| `va` \| `qris_manual`), `amount_idr`, `evidence_url` (nullable, signed URL ke uploaded screenshot di R2), `evidence_note` (nullable, max 500 char), `actor_membership_id` |
| Precondition | `booking.status IN ('pending_manual_payment', 'awaiting_confirmation')`; `payment.status = 'pending_manual_payment'`; `payment.provider = 'manual_whatsapp'`; tidak ada `payment_proof` existing dengan `status = 'verified'` untuk `booking_id` |
| Authorization | Admin only (StaffMembership.role = 'admin') |
| Idempotency | `idempotency_key = booking_id`; re-submit dengan key sama = no-op + return existing `payment_proof.id` |
| Atomic effects (single transaction) | (1) `INSERT INTO payment_proof ...`; (2) `UPDATE payment SET status = 'paid', settled_at = now()`; (3) `UPDATE booking SET status = 'confirmed'`; (4) untuk package: slot reacquire attempt per `ADR 0091` + `PackagePurchase` + ordered `SessionEntitlement` (`SessionEntitlement #1.state = 'scheduled'` jika reacquire sukses, `'pending_schedule'` jika gagal); (5) `INSERT INTO audit_record` (action `mark_as_paid`, reason `manual_whatsapp_verified`); (6) outbox: `booking_confirmed` + `payment_received` email |
| Output | `payment_proof_id`, `booking.status = 'confirmed'`, `payment.status = 'paid'`, `payment.settled_at` |

#### 7.2.2 `RejectPaymentProof` command

| Aspect | Spec |
|---|---|
| Input | `payment_proof_id`, `reason_note` (required, max 500 char), `actor_membership_id` |
| Precondition | `payment_proof.status = 'verified'`; `booking.status = 'confirmed'` |
| Effect | `payment_proof.status = 'rejected'` (audit-logged sebagai `payment_proof_rejected`). **Tidak** mengubah `booking.status` atau `payment.status` (financial tetap settled). |
| Follow-up | Admin minta bukti baru via WhatsApp; jika diterima, Admin create new `payment_proof` row dengan `correction_of = <original_row_id>`. Original immutable history. |

#### 7.2.3 `MarkAwaitingConfirmation` command

| Aspect | Spec |
|---|---|
| Input | `booking_id`, `actor_membership_id` |
| Precondition | `booking.status = 'pending_manual_payment'` |
| Effect | `booking.status = 'awaiting_confirmation'`. SlotHold released (slot kembali ke available pool). Tidak menggerakkan payment. |
| Use case | Admin melihat bukti masuk via WhatsApp, toggle state sebelum verifikasi final. |

#### 7.2.4 Booking state transitions di Admin workspace

| From | Event | To | Side effects |
|---|---|---|---|
| `pending_manual_payment` | Client klik "Saya sudah bayar" / Admin `MarkAwaitingConfirmation` | `awaiting_confirmation` | SlotHold released; email reminder ke Admin `admin_invoice_sent`. |
| `pending_manual_payment` / `awaiting_confirmation` | Admin `MarkAsPaid` | `confirmed` | `payment_proof` insert; `Payment.status = 'paid'` + `settled_at`; slot reacquire attempt (single-session → `Appointment` confirmed atau pending reconcile; package → `SessionEntitlement #1` scheduled atau pending_schedule); outbox events. |
| `pending_manual_payment` / `awaiting_confirmation` | CancellationRequest approve, atau Admin manual cancel (no proof dalam 24h window) | `cancelled` | Slot released per `ADR 0095`. `RefundAction` terpisah jika applicable (tidak ada paid amount → no refund action). |

### 7.3 `payment_proof` audit — CONFIRMED

#### 7.3.1 Schema (D1/SQLite + Postgres equivalent)

```sql
CREATE TABLE payment_proof (
  id                          TEXT PRIMARY KEY,
  booking_id                  TEXT NOT NULL REFERENCES booking(id),
  payment_method              TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','va','qris_manual')),
  amount_idr                  INTEGER NOT NULL CHECK (amount_idr > 0),
  evidence_url                TEXT,
  evidence_note               TEXT,
  verified_by_membership_id   TEXT NOT NULL REFERENCES staff_membership(id),
  verified_at                 TEXT NOT NULL,
  status                      TEXT NOT NULL CHECK (status IN ('verified','rejected')),
  correction_of               TEXT REFERENCES payment_proof(id),
  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX idx_payment_proof_booking_id ON payment_proof(booking_id);
CREATE INDEX idx_payment_proof_verified_at ON payment_proof(verified_at);
CREATE UNIQUE INDEX payment_proof_one_verified_per_booking
  ON payment_proof(booking_id) WHERE status = 'verified';
```

#### 7.3.2 Append-only invariant

- Tidak ada `UPDATE` pada `id`, `booking_id`, `payment_method`, `amount_idr`, `verified_by_membership_id`, `verified_at`, `created_at`.
- `status` transisi `verified → rejected` diizinkan via `RejectPaymentProof` (audit-logged, bukan in-place).
- Setiap re-verify membuat row baru dengan `correction_of` linkage ke row rejected.

#### 7.3.3 Idempotency

- `MarkAsPaid` dengan `idempotency_key = booking_id`: re-submit return existing `payment_proof.id`, no duplicate insert.
- Unique partial index `payment_proof_one_verified_per_booking` mencegah dua `verified` row untuk satu booking pada satu waktu.

#### 7.3.4 Audit trail integration

Setiap `payment_proof` row di-link ke `audit_record`:

| payment_proof action | audit_record action | actor |
|---|---|---|
| Insert dengan `status = 'verified'` | `mark_as_paid` (juga mengaudit Booking transition) | admin |
| Update `status = 'verified' → 'rejected'` | `payment_proof_rejected` | admin |
| Insert dengan `correction_of != null` | `payment_proof_re_verified` | admin |

#### 7.3.5 Retention

`payment_proof` rows tunduk pada Payment/Refund retention policy (audit/legal). Default aman: 7 tahun (Indonesian PSAK + UU PDP untuk financial record), tapi exact duration adalah `TBC-PAY-MANUAL-01` operational concern (admin/finance owner). `evidence_url` (uploaded screenshot) mengikuti retention yang sama; auto-delete dari R2 setelah expiry.

#### 7.3.6 Acceptance test untuk payment_proof

1. **Single verify path**: Admin Mark as Paid → `payment_proof` row dengan `status = 'verified'` → Booking `confirmed` → email `payment_received` terkirim. Atomic.
2. **Re-verify path**: Admin reject existing `payment_proof` (status `rejected`) → Admin create new row dengan `correction_of = <original_id>` → new row `verified`, original immutable. Booking tetap `confirmed`.
3. **Idempotency**: Admin double-click "Mark as Paid" → hanya satu `payment_proof` row, response return existing ID.
4. **Settlement uniqueness**: Dua `MarkAsPaid` concurrent (race) → unique partial index reject salah satu + audit log `mark_as_paid_duplicate_attempt`. Hanya satu `Payment.status = 'paid'`.
5. **Slot reacquire failure (package)**: Admin Mark as Paid untuk package dengan slot yang sudah ter-overlap → `SessionEntitlement #1.state = 'pending_schedule'` + `PackagePurchase.requires_first_session_scheduling = true`. Admin resolution via existing reconciliation flow (`ADR 0067`).

### 7.4 Settlement uniqueness invariants — CONFIRMED (cross-reference `ADR 0093`)

Diperlukan oleh `ADR 0093-payment-settlement-uniqueness.md`. Berlaku untuk semua payment path termasuk WhatsApp manual (per `ADR 0097`):

- **At-most-one successful settlement per `Booking.id` / purchase intent.** Tepat satu `Payment` dengan `status = 'paid'` (yaitu `settled_at IS NOT NULL`) per `Booking.id`. Ditegakkan oleh unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` plus application-level precheck di `MarkAsPaid` handler (defense-in-depth, mengikuti pola `ADR 0091` capacity overlap).
- **Amount/currency match wajib** untuk manual flow. `MarkAsPaid` command melakukan value verification: `payment_proof.amount_idr == offer_snapshot.amount_cents` (Admin input, auto-fill dari OfferSnapshot, editable). Mismatch → typed failure `amount_mismatch`, no state transition. Untuk gateway flow (`PaymentGatewayAdapter`), `verifyNotification` melakukan value match check (`grossAmountCents`, `currency`, `merchantId`); application handler melakukan second verification terhadap `Booking.snapshotted_amount`, `OfferSnapshot.amount_cents`, `OfferSnapshot.currency`, `Booking.id`, dan configured merchant ID. Mismatch → `payment_event_mismatch_log` entry + rollback; tidak ada state transition.
- **Idempotency key scope.** Untuk gateway flow: `payment_event_idempotency` keyed by `(provider_event_id, payment_intent_id)` adalah lifetime (tidak ada TTL selama `PaymentEvent` masih ada). `payload_hash = sha256(canonical_json(payload))`. Same key + same hash → return existing event result; same key + different hash → typed failure `idempotency_key_collision` (rollback, tidak diam-diam overwrite); different key + same payload → new `PaymentEvent` row, no-op transition jika sudah settled. Untuk manual flow: `MarkAsPaid` dengan `idempotency_key = booking_id`; re-submit return existing `payment_proof.id`, no duplicate insert. Unique partial index `payment_proof_one_verified_per_booking` mencegah dua `verified` row per booking.
- **Out-of-order / repeated-status mapping** (lihat `ADR 0093 §4.1`): `capture`/`settlement` final → `Payment.status = 'paid'` + state transition; `pending` → no-op; `deny`/`cancel`/`expire`/`failure` → `Payment.status = 'failed'`; `refund`/`chargeback` → no-op di `Payment` (refund adalah `RefundAction` terpisah per `ADR 0077`); `challenge` → Admin review, no state change. Duplicate `capture` untuk Booking yang sudah settled → idempotency hit, no `Payment` kedua, no email konfirmasi tambahan. Untuk manual flow, tidak ada status mapping — Admin adalah operator; semua transisi eksplisit via command (`MarkAsPaid`, `RejectPaymentProof`, `MarkAwaitingConfirmation`).
- **Crash window untuk manual flow**: tunggal (single transaction per command). `MarkAsPaid` transaction membungkus `INSERT payment_proof` + `UPDATE payment` + `UPDATE booking` + outbox event. Crash di tengah = transaction rollback + retry-safe via `idempotency_key`. Tidak ada crash window tiga-lapis (seperti Midtrans) untuk manual flow.
- **Crash window untuk gateway flow (post-MVP jika Midtrans diaktifkan kembali)**: tiga-lapis per `ADR 0093 §1.2`.
- **Verified event + state transition + outbox harus atomic.** Crash di antara langkah = transaction rollback + retry-safe. Tidak ada partial-commit state yang dapat direkonstruksi sebagai sukses oleh klien.

### 7.5 ManualWhatsappAdapter contract — CONFIRMED (deferred post-MVP future gateway seam)

`PaymentGatewayAdapter` interface tetap dipertahankan sebagai seam untuk reaktivasi payment gateway post-MVP. Untuk launch WhatsApp manual, adapter ini **di-stub** dengan `ManualWhatsappAdapter` yang tidak memanggil provider eksternal:

```ts
interface PaymentGatewayAdapter {
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutCreated>;
  verifyNotification(input: unknown): Promise<VerifiedPaymentEvent>;
  requestFullRefund(input: FullRefundInput): Promise<RefundProviderResult>;
}

interface CreateCheckoutInput {
  bookingId: string;            // = order_id, matches Booking.id
  amountCents: number;          // snapshot from OfferSnapshot.amount_cents
  currency: 'IDR';              // launch only IDR
  clientName: string;
  clientEmail: string;
  enabledMethods: ('qris' | 'va')[];  // launch subset; no e-wallet/card/OTC/BNPL
  expiresAtSeconds: number;     // matches SlotHold TTL (default 600 = 10 min)
  metadata: Record<string, string>;
}

interface CheckoutCreated {
  provider: 'manual_whatsapp';  // launch: no provider; field untuk future gateway reactivation
  providerIntentId: string;     // = Booking.id (no external transaction)
  snapToken: null;              // not applicable
  snapRedirectUrl: null;        // not applicable
  expiresAt: null;              // not applicable; manual flow has no provider-side expiry
}

interface VerifiedPaymentEvent {
  providerEventId: string;       // = payment_proof.id; idempotency key
  paymentIntentId: string;      // = providerIntentId; FK to Payment
  bookingId: string;             // = order_id; must match Booking.id
  eventType:
    | 'capture' | 'settlement'   // → MarkAsPaid verified
    | 'deny' | 'cancel' | 'expire' | 'failure'  // → Admin manual cancel
    | 'refund' | 'partial_refund' | 'chargeback'
    | 'challenge';
  grossAmountCents: number;     // must match OfferSnapshot.amount_cents
  currency: 'IDR';
  merchantId: string;           // launch: 'manual_whatsapp' (no real merchant)
  verifiedAt: string;           // ISO timestamp
  payloadHash: string;          // sha256 hex of canonical JSON payload
  rawPayloadRedacted: Record<string, unknown>;
}

interface FullRefundInput {
  paymentProviderId: string;    // launch: = booking.id (manual off-platform)
  amountCents: number;          // = captured amount for full_refund
  reasonCode: string;           // policy/version reference
  idempotencyKey: string;
}

interface RefundProviderResult {
  provider: 'manual_whatsapp';
  providerRefundId: string;
  status: 'completed' | 'pending' | 'failed';
  rawResult: Record<string, unknown>;
}
```

Adapter wajib:

- **Menyembunyikan** provider status names, payload shape, signature verification, provider reference format, retry semantics (untuk launch, semua ini `null` karena `ManualWhatsappAdapter` adalah stub).
- **Untuk launch (`ManualWhatsappAdapter`)**: `createCheckout` return `CheckoutCreated` dengan `provider = 'manual_whatsapp'` dan semua field opsional `null`. `verifyNotification` selalu throw `manual_flow_unused` (gateway flow tidak digunakan di launch). `requestFullRefund` mengembalikan `RefundProviderResult { status: 'pending', providerRefundId: booking_id + '-manual' }` — Admin kemudian menandai `completed` setelah off-platform transfer selesai.
- **Untuk future gateway reactivation (post-MVP)**: Midtrans adapter akan implement `verifyNotification` dengan signature verification + value match check. Application handler tetap melakukan second verification. Sama seperti dokumentasi asli Midtrans adapter contract di section ini (dipertahankan untuk forward compatibility).
- **Idempotent untuk `createCheckout` retries** dengan `idempotencyKey` yang sama: return existing `providerIntentId`.
- **Idempotent untuk `requestFullRefund` retries** dengan `idempotencyKey` yang sama: return existing `providerRefundId`.

Adapter tidak wajib:

- Mengirim notifikasi ke client (adapter tidak punya akses ke Notification).
- Memutuskan status `paid_late_*` (application handler yang decide berdasarkan `SlotHold` state).
- Memutuskan `PackagePurchase` creation (application handler).

### 7.6 `paid_late` package effects — CONFIRMED

Mengikuti `ADR 0093 §5` Option A. Untuk manual flow, "late" tidak berlaku (tidak ada provider late event), tetapi **slot reacquire failure** pada `MarkAsPaid` menghasilkan efek yang sama dengan `paid_late_first_session_pending`:

- **Slot reacquire berhasil** (atomic claim `CapacityReservation` mengikuti `ADR 0091`):
  - `Payment.status = 'paid'`, `settled_at = now()`.
  - `Booking.status = 'confirmed'`.
  - `PackagePurchase.status = 'paid'`.
  - `SessionEntitlement #1.state = 'scheduled'`, linked ke Appointment reacquired.
  - `SessionEntitlement #2..N.state = 'available'`, `PackageValidity.validity_start = now()`.
- **Slot reacquire gagal** (overlap atau slot unavailable):
  - `Payment.status = 'paid'`, `settled_at = now()`.
  - `Booking.status = 'confirmed'` (Payment tetap settled regardless).
  - `Appointment.state = 'pending_schedule'` (single-session) atau `PackagePurchase.requires_first_session_scheduling = true` + `SessionEntitlement #1.state = 'pending_schedule'` (package).
  - `SessionEntitlement #2..N.state = 'available'` (untuk package), `PackageValidity.validity_start = now()`.
  - Admin resolution: schedule alternative slot untuk #1 (→ `scheduled`), atau `full_refund` (→ PackagePurchase `closed_refunded`, semua remaining entitlement `cancelled`), atau hold for client decision via WhatsApp.

Invariant: `PackagePurchase` dan `SessionEntitlement` rows dibuat **tepat pada saat MarkAsPaid verified**, bukan ditunda. Financial truth terjaga. Admin resolution tidak pernah otomatis — selalu eksplisit Admin decision (konsisten dengan `ADR 0076` no auto-cutoff).

Status names `paid_late_slot_reacquired` / `paid_late_first_session_pending` dicadangkan untuk future gateway integration (saat Midtrans diaktifkan kembali, ADR baru menjelaskan mapping manual → gateway).

### 7.7 Duplicate Mark-as-Paid integration test (acceptance criteria #1)

Didefinisikan di `ADR 0097 §7.2`. Skenario test wajib:

1. Buat `Booking` dengan `Booking.id = X`. `Payment` row `status = 'pending_manual_payment'`, `provider = 'manual_whatsapp'`.
2. Admin submit `MarkAsPaid` dengan `idempotency_key = X`, `payment_method = 'bank_transfer'`, `amount_idr = 235000`, `evidence_url = <signed_url>`, `evidence_note = 'BCA transfer 235000'`.
3. Admin submit `MarkAsPaid` ulang dengan `idempotency_key = X` (double-click atau network retry).
4. Assertion:
   - Hanya satu `payment_proof` row dengan `status = 'verified'` (verified by unique partial index).
   - Submission pertama apply state transition: `Booking.status = 'confirmed'`, `Payment.status = 'paid'`, `settled_at = now()`.
   - Submission kedua adalah idempotency no-op (return existing `payment_proof.id`, no duplicate row, no duplicate email).
5. State akhir: Booking confirmed, `Payment.settled_at` di-set sekali (tidak di-update kedua kali).

### 7.8 Slot reacquire failure integration test (acceptance criteria #2)

Didefinisikan di `ADR 0097 §7.2.6.5` dan `ADR 0093 §5`. Skenario test wajib:

1. Buat `Booking` package (couple atau individual) dengan `Booking.id = Y`, `SlotHold` aktif untuk slot `S1`.
2. Klien transfer manual dan kirim bukti.
3. Place `CapacityReservation` baru untuk slot lain (hold oleh Booking berbeda) untuk mensimulasikan overlap → reacquire attempt akan gagal.
4. Admin submit `MarkAsPaid` untuk `Y` dengan bukti valid.
5. Assertion:
   - `Payment.status = 'paid'`, `settled_at` di-set.
   - `Booking.status = 'confirmed'`.
   - `PackagePurchase.status = 'paid_late'` (atau flag `requires_first_session_scheduling = true`).
   - `SessionEntitlement #1.state = 'pending_schedule'`.
   - `SessionEntitlement #2..N.state = 'available'`.
   - `PackageValidity.validity_start = now()` (bukan original booking time).
6. Admin resolution action: `ScheduleNextEntitlement` untuk slot `S2` (different slot).
7. Assertion post-resolution:
   - `SessionEntitlement #1.state = 'scheduled'`, linked ke `Appointment` di `S2`.
   - `PackagePurchase.requires_first_session_scheduling = false`.
   - `Booking` tetap `confirmed` (Payment settled, slot reacquire failure adalah orthogonal concern).

### 7.9 Refund off-platform — CONFIRMED

Mengikuti `ADR 0077` vocabulary (`full_refund` / `no_refund`):

- `RefundAction` row di-create oleh Admin di Admin Cancellation & Refund Workspace setelah `CancellationDecision approve`.
- `RefundAction.provider_reference = "manual_bank_transfer:<YYYY-MM-DD>:<admin_internal_ref>"`.
- `RefundAction.status` transitions: `pending` (default saat create) → `completed` (setelah Admin konfirmasi transfer balik selesai) atau `failed` (transfer gagal, retry / bank berbeda).
- Tidak ada automatic disbursement. Admin adalah operator.
- `Payment.status` summary update via derived projection: `refunded_full` jika `RefundAction` `completed` dengan `full_refund`; `refunded_no_disbursement` jika `no_refund`. Bukan in-place rewrite historical.

### 7.10 PRODUCTION GATE / TBC

- **`TBC-PAY-MANUAL-01` (PRODUCTION GATE)**: Admin verification SLA (default ≤ 24 jam kerja), `payment_proof` retention duration (audit/legal policy), dispute escalation path (Admin → Operations → Finance), dan PDF rendering library choice. Operational concern; bukan domain blocker.

`TBC-PAY-01` (Midtrans-specific evidence gap) **closed by `ADR 0097`** — Midtrans no longer in launch path; specific evidence not required for launch. Midtrans-specific items (merchant onboarding, sandbox test, retry/dead-letter) deferred post-MVP.

`TBC-PAY-SETTLEMENT-01` tetap closed by `ADR 0093`; settlement uniqueness invariant berlaku untuk manual flow juga (unique partial index + application precheck).

`TBC-PAY-EXPIRY-01` **closed by `ADR 0097`** — provider expiry no longer relevant (no provider). Reopen jika Midtrans diaktifkan kembali post-MVP.

`TBC-PAY-SETTLEMENT-01` closed by `ADR 0093-payment-settlement-uniqueness.md`; manual flow coverage di `§7.4` di atas; patch section §6.3 dan §6.4 cross-reference.

## 8. Persistence and data rules

### 8.1 General

- D1 migrations adalah source of schema evolution.
- Money disimpan sebagai integer minor unit/IDR amount; jangan gunakan floating point.
- Timestamp disimpan dalam format machine-readable yang konsisten; calendar-period semantics dan display memakai `Asia/Jakarta`.
- Unique constraint/idempotency key wajib digunakan untuk duplicate-sensitive records.
- Append-only record: `PaymentEvent`, `RefundAction`, `CancellationDecision`, `AuditRecord`, `ConsentRecord` version, dan outcome correction.
- Snapshot wajib immutable setelah transaction/purchase dibuat.

### 8.2 Concurrency

Minimal concurrency protections:

- conditional update pada SlotHold berdasarkan state/expiry;
- unique active hold per slot;
- conditional Appointment confirmation berdasarkan verified payment + valid hold/reacquisition;
- optimistic version/precondition untuk Admin state-changing commands;
- idempotency key untuk webhook, refund, cancellation approval, and notifications;
- atomic transaction untuk cancellation approval + eligible slot release + entitlement restore;
- no read-then-write sequence yang dapat memisahkan ketiga effect cancellation.

## 9. Privacy and retention

### 9.1 Data boundary — CONFIRMED

Allowed:

- minimal Client/contact identity;
- verified email/phone;
- offering/package dan price/mode/duration snapshot;
- slot/Appointment time;
- package/entitlement operational state;
- Payment/Refund references;
- ConsentRecord;
- Notification delivery metadata;
- Audit/security metadata;
- bounded non-clinical support metadata.

Forbidden in MVP:

- diagnosis;
- detailed symptoms;
- assessment results;
- treatment/session notes;
- transcript/raw WhatsApp chat;
- crisis narrative;
- automated triage/risk result.

### 9.2 Retention — CONFIRMED baseline + TBC policy values

- Client/contact: 12 bulan setelah last active service.
- Payment/PaymentEvent/RefundAction: applicable audit/legal policy.
- Audit/security metadata: applicable audit/legal policy.
- ConsentRecord: selama related records dipertahankan atau selama diperlukan policy/legal requirement.
- Notification/DeliveryAttempt dan Booking/Appointment: category-specific RetentionPolicy.

**TBC-PRIVACY-01 / PRODUCTION GATE:** exact policy-controlled duration, definition/event trigger untuk `last active service`, exception precedence, policy owner evidence, dan execution cadence.

Saat Client/contact eligible:

1. redact direct identifier/contact fields;
2. pertahankan non-reversible pseudonymous reference hanya jika minimum transactional/audit integrity membutuhkan;
3. catat policy/version/action/result di audit;
4. jangan cascade-delete Payment/Refund/Audit integrity.

## 10. Notifications and manual support

### 10.1 Automated email — CONFIRMED

Email dipakai untuk:

- payment/Booking state;
- Appointment confirmation;
- schedule change/reschedule;
- cancellation decision;
- default reminders 24 jam dan 2 jam sebelum Appointment;
- package expiry/remaining-session reminders setelah offset ditentukan.

Delivery failure tidak me-roll back domain truth.

**TBC-NOTIFY-01:** provider email, sender/domain verification, copy/template, localization, bounce handling, dan package reminder offset.

### 10.2 WhatsApp — CONFIRMED boundary

- Admin WhatsApp adalah **public channel satu-satunya** untuk cancellation/refund requests.
- Klien menghubungi Admin WhatsApp untuk cancellation/refund; Admin merekam `CancellationRequest` minimum dan memproses lewat Admin workspace.
- WhatsApp contact number tetap opsional untuk klien; tidak wajib untuk booking/confirmation.
- Tidak ada automated provider, required task, SLA, frequency, acknowledgement gate, atau fallback authority.
- WhatsApp message tidak mengubah Booking/Appointment/Payment sendiri.
- Cancellation/refund conversation ditulis sebagai domain command/record jika menghasilkan keputusan; tiered amount atau biaya admin/transfer pihak ketiga adalah biaya internal Seraya, tidak dibebankan ke klien.
- Chat transcript tidak menjadi required domain record.
- Public website tidak memiliki cancellation atau refund UI; copy merujuk Admin WhatsApp.

## 11. Admin workspace and audit

Admin workspace minimal harus bisa:

- melihat Booking/Appointment dan payment state;
- melihat active/past SlotHold dan availability result;
- membuat/meninjau CancellationRequest;
- approve/deny cancellation;
- menjalankan separate full_refund/no_refund action;
- melihat refund provider/reconciliation state yang sudah diredact;
- mengelola package/entitlement operational state;
- mengelola availability override;
- membuat/revoke StaffMembership;
- memproses PrivacyRequest;
- melihat audit trail.

**TBC-ADMIN-01:** exact form fields, table columns, filter, bulk action, visibility matrix detail, notification copy, dan exception UX. Default: least privilege; jika field tidak diperlukan untuk command, jangan tampilkan.

Audit record minimal:

- actor/staff membership;
- action/command;
- target type/id;
- before/after state atau decision result;
- reason/policy reference;
- correlation/idempotency key;
- timestamp;
- redacted provider reference bila ada.

## 12. Suggested implementation sequence

### Slice 0 — Foundation

- D1 schema/migrations;
- typed domain vocabulary;
- command result/error model;
- idempotency/correlation utilities;
- audit writer;
- test fixtures dan fake clock.

### Slice 1 — Catalog and public availability

- ServiceOffering/Revision/Package;
- Fuja launch fixture;
- online/offline counseling;
- price/duration snapshots;
- AvailabilityRule/Exception/Slot;
- placeholder schedule hanya di development/design.

### Slice 2 — Guest booking and SlotHold

- Client/guest identity;
- Booking + OfferSnapshot;
- 10-minute SlotHold;
- expiry/release;
- concurrency tests.

### Slice 3 — Payment adapter

- `PaymentGatewayAdapter` seam;
- fake adapter tests;
- Midtrans Snap adapter;
- verified webhook/PaymentEvent;
- duplicate/late/failure handling;
- no confirmation from redirect.

### Slice 4 — Package entitlement

- full upfront purchase;
- ordered entitlements;
- first Appointment;
- sequential scheduling;
- completed/no_show consumption;
- validity/expiry policy seam.

### Slice 5 — Staff and ClientAccess

- Google SSO;
- StaffMembership invite/allowlist;
- two Admin bootstrap;
- Psychologist least-privilege projection;
- guest magic link/OTP and scoped session.

### Slice 6 — Cancellation/refund

- CancellationRequest;
- approve/deny;
- atomic cancel/release/restore transaction;
- separate RefundAction;
- full/no-refund only;
- retry/reconciliation state.

### Slice 7 — Notifications and support

- email events/reminders;
- DeliveryAttempt;
- optional manual WhatsApp contact metadata;
- no WhatsApp lifecycle enforcement.

### Slice 8 — Privacy/retention

- ConsentRecord;
- PrivacyRequest;
- RetentionPolicy;
- redaction/pseudonymization;
- dry-run/audit mode before destructive action.

### Slice 9 — CMS/admin hardening and UAT

- Admin workspace;
- audit review;
- accessibility/mobile states;
- UAT scenarios;
- production gate evidence.

## 13. Test requirements

### 13.1 Domain/module tests

- SlotHold expiry and duplicate hold prevention.
- Payment confirmation only from verified PaymentEvent.
- Duplicate webhook idempotency.
- Late payment reacquires original slot only.
- No alternate auto-assignment.
- Package entitlement order/consumption/restoration.
- `completed`, `completed_partial`, `no_show` (T+15m checkpoint), `no_show_late` consumption per `ADR 0092 §6.1.1`.
- OutcomeCorrection window 7×24 jam (in-window vs out-of-window) per `ADR 0092 §6.1.3`.
- CancellationRequest at-most-one-open invariant per `ADR 0095 §1.2`.
- Cancellation pending-vs-outcome race R1/R2 auto-resolve per `ADR 0095 §2`.
- Cancellation approval-before-outcome R3 rejects late outcome marking with `E-APPOINTMENT-ALREADY-CANCELLED` per `ADR 0095 §2`.
- Reschedule-vs-pending R4 rebound of CancellationRequest to replacement per `ADR 0095 §5.4`.
- Cancellation approval atomic effects per target (appointment / booking / package_purchase) per `ADR 0095 §3`.
- Package-wide cancellation closes future Appointments + restores/closes unused entitlements + closes PackagePurchase in one transaction per `ADR 0095 §3.2`.
- Partial-package (1-of-N) cancellation leaves PackagePurchase `partially_consumed` per `ADR 0095 §3.1`.
- Cancellation denial has no transactional mutation.
- Repeat/correction: supersede linkage, original immutable history, new decision applies §3 afresh (idempotent) per `ADR 0095 §4`.
- Refund full/no-refund separate from cancellation.
- Refund retry does not double-disburse.
- RescheduleAction forbidden transitions (after completed/no_show/cancelled/rescheduled) per `ADR 0095 §5.1`.
- Reschedule capacity overlap on replacement slot rejected.
- Couple-package cancellation: target resolution per `ADR 0095 §6`; joint pre-start restores entitlement #3; mid-session withdrawal is NOT a cancellation path.
- Availability changes do not mutate held/booked/historical records.
- Psychologist cannot access payment/refund/privacy/staff mutations.
- Editor cannot access launch because role is deferred.
- ClientAccess cannot enumerate or mutate unrelated records.
- Retention redaction does not destroy financial/audit integrity.
- No forbidden clinical fields enter allowed write paths.

### 13.2 Integration tests

- Manual payment proof recording, amount match, verification, and rejection.
- Duplicate/repeated Admin verification is idempotent.
- Invoice PDF/text generation uses the immutable OfferSnapshot.
- Refund remains a separate audited off-platform action.
- Midtrans adapter tests are deferred until the payment decision is reopened.
- Google SSO + membership enforcement.
- Email delivery failure without domain rollback.

### 13.3 Browser/UAT tests

- Four program pillars public; only SERAYA PULANG has checkout.
- Counseling online/offline catalog and package pricing.
- Guest booking and hold expiry.
- Manual payment invoice, WhatsApp handoff, proof review, acceptance, and rejection.
- Package next-session scheduling.
- Admin cancellation approve/deny and separate refund.
- Staff role visibility.
- Mobile keyboard/focus/contrast/error states.
- Privacy/no-clinical-data boundary.

## 14. TBC register

| ID | Topic | Current implementation instruction | Owner / gate |
|---|---|---|---|
| TBC-ACCESS-01 | ClientAccess rate limit/recovery/revocation | Isolate in AccessPolicy; use conservative configurable defaults | Technical; before production |
| TBC-API-01 | Exact API routes/payloads | Define transport after command interfaces and UAT cases | Technical |
| TBC-PACKAGE-01 | Exact validity calendar semantics/reminders | Store snapshot policy; do not read current catalog for old purchase | Business + technical |
| TBC-PAY-MANUAL-01 | Admin verification SLA, payment-proof retention, dispute handling, real account/QRIS configuration | Keep manual flow behind `WhatsAppManualPaymentModule`; demo configuration cannot pass production gate | Operations/finance; production gate |
| TBC-PRIVACY-01 | Policy duration/trigger/exception/evidence | Implement RetentionPolicy, no destructive production action yet | Clinical/ethics + technical/data; production gate |
| TBC-NOTIFY-01 | Email provider/copy/bounce/package offsets | Domain events first; provider behind NotificationAdapter | Business + technical |
| TBC-ADMIN-01 | Admin forms/visibility/copy | Least privilege and command-driven UI | Technical + operations |
| TBC-SCHEDULE-01 | Fuja recurring schedule/offline venue | Placeholder only; no live slot publication | Operations; production gate |
| TBC-POLICY-01 | Package unavailability SLA/credit/transfer workflow | Same-offering resolution first; explicit client consent for transfer | Business + clinical/ethics |
| TBC-REC-01 | Retry/dead-letter/reconciliation cadence | Persist reconciliation-required; never silently resolve | Operations/finance; production gate |
| TBC-CONSENT-01 | Final consent wording/publication evidence | Version ConsentRecord and block publish where required | Clinical/ethics; production gate |
| TBC-LIVE-PRD-01 | Reconcile live form readback with canonical closure baseline | Do not treat missing summary fields as new business decisions; reconcile against ADR/domain model before using live form as authority | Technical; before implementation handoff |
| TBC-PACKAGE-CANCEL-01 | Package-wide cancellation matrix and pending-versus-outcome race | **Closed by ADR 0095-package-cancellation-matrix.md**: targets, open-request invariant, R1–R4 race resolution, atomic package-wide effects, partial-package 1-of-N, repeat/correction, couple override, RescheduleAction table | Owner: clinical/ethics + operations + technical; closed 2026-08-31 |
| TBC-NO-SHOW-01 | No-show early checkpoint vs terminal outcome/late-arrival correction | **Closed by ADR 0092-appointment-outcome-timing.md**: `no_show` early checkpoint T+15m, `completed_partial` 1–59m, `no_show_late` late arrival with session held, OutcomeCorrection window 7×24 jam | Owner: clinical/ethics + operations; closed 2026-08-31 |
| TBC-RESCHEDULE-01 | Allowed RescheduleAction lifecycle states/cutoff/repeat handling | **Closed by ADR 0095-package-cancellation-matrix.md §5**: forbidden transitions enumerated, replacement capacity overlap enforced, couple-package rules via BookingParticipant, cancellation-request rebound (R4) | Owner: operations + technical; closed 2026-08-31 |
| TBC-PAY-SETTLEMENT-01 | At-most-one successful settlement and package `paid_late` effects | Verify amount/currency uniqueness per intent; document `paid_late` PackagePurchase/Entitlement creation rules | Business/ops + technical; before Slice 3 production |
| TBC-EXTENSION-01 | Explicit Admin extension state for entitlement/correction past windows | Add `extension_request` / `extension_grant` audited commands; matrix update to ADR 0092 §6.1.3 and ADR 0095 §3 | Operations; before production |

## 15. Definition of implementation-ready

A slice is implementation-ready when:

- vocabulary and aggregate ownership are clear;
- command seam is defined;
- invariant and failure modes are written;
- idempotency/concurrency behavior is specified;
- test seam is agreed;
- TBCs are isolated and not silently decided in code.

The MVP is implementation-ready for core slices when:

- Catalog, booking, hold, payment adapter, package, RBAC, cancellation/refund, privacy boundary, and audit seams exist;
- fake provider and failure paths are tested;
- no clinical data path exists;
- production-only TBCs remain configuration/runbook/policy work, not hidden TODOs in domain logic.

## 16. Production launch gate

PRD/design handoff can proceed now using this document and explicit placeholders (see §16.1). Production launch requires passing every gate in §16.2 with named-role owner sign-off and concrete acceptance evidence attached (no narrative-only "TBD"). No cell in §16.2 may be left as `TBD` or `TBC`; every blocked gate must close the related TBC first per §16.3.

Canonical checklist: `docs/adr/0096-launch-gate-checklist.md` (this section is the executable mirror). Gate numbering `G-1`..`G-14` and source ADRs match `ADR 0096 §3`.

### 16.1 PRD/design handoff checklist (allowed now)

These items are **not** gates for PRD/design handoff. Handoff may proceed now using this guide, `DOMAIN-MODEL.md`, ADR 0001–0095, and explicit placeholders per `ADR 0088`.

|| # | Item | Handoff assumption | Placeholder / explicit marker |
||---|---|---|---|
|| H-1 | Domain model vocabulary | `DOMAIN-MODEL.md` + ADR 0089–0095 | none |
|| H-2 | Aggregate ownership | `ADR 0095 §3` (Booking/Appointment/PackagePurchase/SessionEntitlement) | none |
|| H-3 | Catalog/pricing (individual only) | `IMPLEMENTATION-GUIDE.md §2.1` + `ADR 0074` | couple: see §16.2 G-6 |
|| H-4 | Catalog/pricing (couple) | shown in catalog with badge `coming soon` per `PRD-GUIDELINE-REVIEW.md Round 2 R2-07 recommendation` | explicit `not_purchasable` until G-6 evidence |
|| H-5 | Identity/auth model | `ADR 0080` Google SSO + `ADR 0081` two-Admin bootstrap | staff-session TBC carries forward |
|| H-6 | State machines | Booking/Payment/Appointment/Package/Entitlement/Cancellation/Refund per `ADR 0095` + `ADR 0093` + `ADR 0092` | none |
|| H-7 | Module seams | `IMPLEMENTATION-GUIDE.md §5` | TBC-API-01 routes/payload |
|| H-8 | Test seams | `IMPLEMENTATION-GUIDE.md §13` | none |

### 16.2 Production-launch checklist (Matrix §7, executable)

`Blocking stage` legend:

- `before slice` — must close before the implementation slice that depends on it can start.
- `before UAT` — must close before UAT scenarios from §13.3 are recorded as pass.
- `production only` — must close before production DNS/worker switches from staging to live domain, but does not block UAT.

| Gate | Title | Owner (named role) | Blocking stage | Acceptance evidence (artifact) | Source ADR / TBC |
|---|---|---|---|---|---|
| **G-1** | Profile asset, service presentation, placeholder venue/schedule clearly marked `fixture-only`, NOT paid at launch | business owner + technical | `before UAT` | (a) `PsychologistProfile.publish_status` for non-Fuja slots = `not_published` (D1 query returns empty); (b) catalog screenshot showing `coming soon` badge on couple; (c) Fuja profile fields complete per `ADR 0075`; (d) business owner sign-off note confirming "no live paid booking except SERAYA PULANG individual counseling". | `ADR 0075`, `Ticket 06 06.6`, `PRD-GUIDELINE-REVIEW.md Round 2 R2-08` |
| **G-2** | Real availability + online joining instructions + offline venue | operations + psychologist (Fuja) + technical | `before UAT` | (a) `AvailabilityRule` rows populated for Fuja's recurring schedule; (b) `AvailabilityException` for blackouts; (c) **no row with `location_label = 'anytime'`** in published slots (D1 query returns empty); (d) online join instructions at `docs/operations/online-join-instructions.md`; (e) offline venue at `docs/operations/offline-venue.md`; (f) psychologist sign-off confirming schedule is current. | `ADR 0075`, `ADR 0088:17`, `TBC-SCHEDULE-01` |
| **G-3** | Approved consent, privacy notice, cancellation/refund policy, crisis/referral information | clinical/ethics + business owner | `production only` | (a) Consent copy final versioned at `docs/consent/consent-v1.md` (8 sections matching JSON `consents`); (b) clinical/ethics sign-off note in frontmatter; (c) privacy notice published page URL + 12-month retention per `ADR 0083`; (d) cancellation/refund public copy `"Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."` published on `/booking` + in confirmation email; (e) crisis boundary text in every public page footer per `ADR 0082`; (f) `referrals` populated with ≥3 named services; `TBC-CONSENT-01` + `TBC-CANCELLATION-PUBLIC-01` must be closed. | `ADR 0082`–`0086`, `ADR 0076`/`0077`, Round 3 |
| **G-4** | Verified payment integration and reconciliation behavior | technical + finance + operations | `production only` | (a) Midtrans sandbox test pass log (CI run-id) — capture/settlement/expire/refund all green; (b) production merchant activation evidence (dashboard screenshot or signed letter) — QRIS + VA enabled; (c) ≥1 successful sandbox test refund with disbursement; (d) reconciliation runbook at `docs/operations/payment-reconciliation.md` (daily cadence, retry policy, dead-letter escalation); (e) `paid_late` integration test pass (run-id, `§7.7`); (f) duplicate webhook integration test pass (run-id, `§7.6`); (g) finance sign-off on QRIS/VA account mapping; (h) `TBC-PAY-01` + `TBC-PAY-EXPIRY-01` must be closed. | `ADR 0088:13-14`, `ADR 0093`, `§7.3–§7.7` |
| **G-5** | Booking confirmation/reminder flow and operational owner | operations + technical | `before UAT` | (a) Email templates final: `docs/templates/email/{booking-confirmation,payment-confirmation,reminder-24h,reminder-2h,outcome-finalized,no-show-recorded}.md`; (b) UAT §13.3 reminder scenarios pass with delivery log; (c) Admin WhatsApp number in `/contact` footer + confirmation email; (d) on-call runbook `docs/operations/admin-on-call.md` with primary + backup Admin + response SLA; (e) `TBC-NOTIFY-01` must be closed. | `ADR 0052`, `ADR 0088:19`, Round 3 |
| **G-6** | Couple-participant/consent decisions if couple counselling is bookable | business owner + clinical/ethics + technical | `production only` | If **couple launch-deferred** (recommended per `PRD-GUIDELINE-REVIEW.md Round 2 R2-07`): business owner sign-off note + catalog badge `coming soon` verified in §13.3 UAT. If **couple launch-ready**: (a) `BookingParticipant`/`AppointmentParticipant` migration applied (migration-id); (b) `couple_consent` + `participant_consent_a` + `participant_consent_b` + `joint_session_consent` finalized and signed by clinical/ethics; (c) notification routing test pass; (d) visibility matrix test pass; (e) couple-package cancellation test per `ADR 0095 §6`. | `ADR 0090`, `ADR 0095 §6`, `PRD-GUIDELINE-REVIEW.md Round 2 R2-07`/`R2-11` |
| **G-7** | Architecture / persistence stack ratified | technical | `before slice 0` | `ADR 0089-architecture-worker-d1.md` accepted; `migrations/0001_init.sql` applied to D1 binding; backup/restore runbook at `docs/operations/d1-backup-restore.md`; D1 binding in `wrangler.toml` (committed). | `ADR 0089`, `PRD-GUIDELINE-REVIEW.md Round 1 P0-01` |
| **G-8** | Booking intake, minor (16–17) guardian route, eligibility boundary, cutoff | business owner + clinical/ethics + technical | `before slice 2` | `ADR 0094-intake-eligibility-cutoff.md` accepted; intake schema applied (D1 migration-id); JSON `booking_intake` updated to match `ADR 0094` field list; `1 hour before scheduled_start` cutoff enforced in `CreateBooking` precondition (integration test run-id). | `ADR 0094`, `PRD-GUIDELINE-REVIEW.md Round 1 P0-04`, `Ticket 09` |
| **G-9** | No-show timing, late-arrival correction window | clinical/ethics + operations + technical | `before UAT` | `ADR 0092-appointment-outcome-timing.md` accepted; T+15m auto-checkpoint cron handler deployed to Worker; `OutcomeCorrection` 7×24h window enforced (integration test run-id covering in-window vs out-of-window). | `ADR 0092`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-12` |
| **G-10** | Package-wide cancellation matrix + outcome race | operations + technical | `before UAT` | `ADR 0095-package-cancellation-matrix.md` accepted; D1/Postgres triggers applied (migration-id); 15 acceptance criteria tests pass (run-id); couple-package target resolution per `ADR 0095 §6` test pass. | `ADR 0095`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-13`, `Ticket 10` |
| **G-11** | Payment settlement uniqueness + `paid_late` package | technical + finance | `production only` (paired with G-4) | Unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` applied (migration-id); `paid_late` test pass (`§7.7` run-id); duplicate webhook test pass (`§7.6` run-id); finance sign-off confirming reconciliation report uses `Payment.settled_at` as canonical truth. | `ADR 0093`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-10` |
| **G-12** | Two-Admin bootstrap + last-active-Admin guard | business owner + operations + technical | `before UAT` | (a) `StaffMembership` rows for both bootstrap Admins with `RoleAssignment.role = 'admin'` and `is_active = true` (D1 query result); (b) last-active-Admin guard implementation (cannot revoke the only remaining active Admin without another Admin present — integration test run-id); (c) Google SSO configured per `ADR 0080` (OAuth client_id/secret in secret store, redirect URIs registered). | `ADR 0080`, `ADR 0081`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-11` |
| **G-13** | UAT pass for recorded critical scenarios | operations + technical + business owner | `production only` | (a) UAT §13.3 scenarios recorded as pass with screenshots + run-ids (four program pillars; counseling catalog + pricing; guest booking + hold expiry; payment success/failure/late webhook; package next-session scheduling; Admin cancellation approve/deny + separate refund; staff role visibility; mobile keyboard/focus/contrast/error; privacy/no-clinical-data); (b) accessibility/perf/SEO checks (Lighthouse scores committed); (c) business owner walkthrough sign-off. | `§13.3`, `ADR 0088:12`, `PRD-GUIDELINE-REVIEW.md Round 1 P1-06` |
| **G-14** | Operational sign-off (consolidated) | business owner + operations + clinical/ethics + finance + technical | `production only` | Consolidated sign-off at `docs/launch/release-sign-off-v1.md` listing G-1..G-13 status (pass / blocked / waived) with each owner's signature (typed name + role + date) and attached evidence links. No `TBD` cells. Waivers require explicit business owner acknowledgement. | this section + `ADR 0096 §3` |

### 16.3 Gate-to-TBC dependency map

Every TBC that still blocks one or more gates is listed below. Closing each TBC is the prerequisite for collecting the related evidence; the TBC is **not** closed until the evidence artifact exists.

| TBC | Blocks gate | Closure action |
|---|---|---|
| `TBC-CONSENT-01` | G-3 | Clinical/ethics sign-off on consent copy final; commit `ConsentRecord.version`. |
| `TBC-PRIVACY-01` | G-3 | Retention policy values decided; execution cadence documented; test fixtures redacted. |
| `TBC-PAY-01` | G-4 | Method codes, fees, limits, refund capability documented; adapter config committed. |
| `TBC-PAY-EXPIRY-01` | G-4 | Provider expiry vs SlotHold TTL invariant decided; integration test pass. |
| `TBC-NOTIFY-01` | G-5 | Email provider + sender/domain verification + bounce handling + reminder offsets committed. |
| `TBC-REC-01` | G-4, G-11 | Reconciliation cadence and dead-letter policy committed. |
| `TBC-ADMIN-01` | G-12, G-5 | Admin workspace fields/visibility matrix committed; last-active-Admin guard tested. |
| `TBC-ACCESS-01` | G-12 | ClientAccess rate limit/recovery/revocation decided; conservative defaults applied. |
| `TBC-STAFF-SESSION-01` | G-12 | OAuth state/nonce/session/cookie/CSRF/re-auth/revocation/recovery behavior committed. |
| `TBC-COUPLE-LAUNCH-01` | G-6 | Business owner decides couple launch-deferred (default) vs launch-ready. |
| `TBC-SCHEDULE-01` | G-2 | Fuja recurring schedule + offline venue confirmed; AvailabilityRule populated. |
| `TBC-API-01` | G-13 | Transport routes/payloads defined; UAT scenarios reference real endpoints. |
| `TBC-LIVE-PRD-01` | G-13, G-14 | Live form reconciled with closure baseline; missing canonical keys restored or removed. |
| `TBC-EXTENSION-01` | G-9, G-10 | `extension_request` / `extension_grant` audited commands added to `ADR 0092 §6.1.3` and `ADR 0095 §3`. |

### 16.4 Release sign-off template

Live launch can only proceed after `G-14` consolidated sign-off is signed and every G-1..G-13 gate is `pass` or explicitly `waived` by the business owner.

Required signatures on `docs/launch/release-sign-off-v1.md`:

- **Business owner** — G-1 (catalog/scope), G-3 (public copy), G-6 (couple decision), G-13 (walkthrough), G-14 (consolidated).
- **Clinical/ethics** — G-3 (consent, privacy notice, crisis, referrals), G-6 (if launch-ready), G-9 (no-show timing).
- **Operations** — G-2 (availability + venue), G-4 (payment + reconciliation), G-5 (confirmation/reminder + on-call), G-9, G-10, G-12, G-13, G-14.
- **Finance** — G-4 (account mapping), G-11 (canonical truth).
- **Technical** — G-1 (non-Fuja publish_status), G-2 (no `anytime` slots), G-4 (signature + value match), G-5 (email delivery), G-6 (if launch-ready), G-7 (architecture), G-8 (intake/cutoff), G-9 (T+15m cron), G-10 (cancellation triggers), G-11 (settlement uniqueness), G-12 (Admin guard + SSO), G-13 (UAT infrastructure), G-14 (consolidated).

Until G-14 is signed, development may use fixtures and sandbox behavior, but production must not infer or silently invent the missing business decisions.
