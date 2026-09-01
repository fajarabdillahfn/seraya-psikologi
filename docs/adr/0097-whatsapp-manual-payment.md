# 97. WhatsApp Manual Payment Flow for MVP Launch

## Status

Accepted for MVP launch. **Supersedes** `ADR 0068-midtrans-snap-launch-gateway.md` and `ADR 0069-launch-payment-methods.md` for the launch path. Midtrans (Snap or Core API) and any other Indonesian payment gateway are **deferred** to post-MVP. The launch payment surface is: **manual bank transfer / Virtual Account / QRIS manual**, with the client receiving a PDF + plain-text invoice via WhatsApp, paying manually off-platform, and an Admin marking the Booking as paid after reviewing evidence in the Admin workspace.

This ADR closes the launch-path scope of `TBC-PAY-01` (the original Midtrans-specific evidence gap) and `TBC-PAY-EXPIRY-01` (provider-expiry invariant) by removing the provider entirely from the launch path. Both rows in the TBC register are replaced by a single new operational TBC `TBC-PAY-MANUAL-01` for Admin verification SLA, evidence retention, and dispute handling.

## Ringkasan eksekutif (Bahasa Indonesia)

- **Tidak ada payment gateway di launch.** Klien membayar manual lewat transfer bank, Virtual Account, atau QRIS manual ke rekening/akun Seraya. Invoice diberikan via WhatsApp dalam dua format: PDF (downloadable, untuk arsip) dan plain text (untuk forward / share). Tidak ada redirect, tidak ada webhook, tidak ada Snap, tidak ada Midtrans.
- **Booking state machine baru.** Empat status utama terkait pembayaran: `pending_manual_payment` → `awaiting_confirmation` → `confirmed` (Admin mark-as-paid) → `cancelled`. Tidak ada lagi `pending` (provider-intent waiting webhook) atau `paid_late_*` (provider late event) untuk path launch ini.
- **Admin workspace: tombol "Mark as paid".** Admin menerima bukti pembayaran dari klien (foto screenshot transfer, nomor referensi, atau teks sederhana) lewat WhatsApp. Admin membuka Booking di Admin workspace, memilih `payment_method` (`bank_transfer` / `va` / `qris_manual`), meng-upload atau menulis evidence, lalu menekan tombol "Mark as paid". Sistem membuat `payment_proof` record dan menggerakkan `Booking.status` ke `confirmed` atomically dalam satu transaction.
- **`payment_proof` table.** Append-only record per verifikasi. Fields: `id`, `booking_id`, `payment_method` (enum: `bank_transfer` | `va` | `qris_manual`), `amount_idr` (integer minor unit), `evidence_url` (nullable: URL ke uploaded image/screenshot), `evidence_note` (nullable: free-text Admin note, mis. nama pengirim, waktu transfer), `verified_by_membership_id` (FK ke StaffMembership admin yang memverifikasi), `verified_at` (ISO timestamp Asia/Jakarta), `status` (enum: `verified` | `rejected`). Idempotent dan re-verifiable: Admin boleh `reject` lalu re-`verify` (mis. jika klien kirim bukti kedua) — setiap perubahan adalah `payment_proof` row baru, original immutable.
- **Audit trail.** Setiap state change Booking (`pending_manual_payment` → `awaiting_confirmation` → `confirmed` / `cancelled`) dicatat di `audit_record` dengan `actor_membership_id`, `before_state`, `after_state`, `reason_code`, `timestamp`. Tidak ada rewrite in-place.
- **Refund tetap berlaku sama.** `RefundAction` `full_refund` / `no_refund` per `ADR 0077`; tidak ada perubahan. Refund dijalankan off-platform (transfer balik manual ke rekening klien), direkam dengan `provider_reference = "manual_bank_transfer"` dan `status = completed` setelah Admin konfirmasi transfer selesai.

## Context

`ADR 0068` memilih Midtrans Snap sebagai launch payment gateway, dengan `ADR 0069` mempersempit ke QRIS + bank transfer/VA. Sejak keputusan itu, beberapa blocker operasional teridentifikasi:

1. **Midtrans merchant onboarding** belum selesai; estimasi waktu aktivasi production account belum tersedia.
2. **Sandbox evidence** untuk verifikasi signature, value match, idempotency, retry/dead-letter, dan reconciliation cadence belum terkumpul (`TBC-PAY-01`).
3. **Provider expiry ↔ SlotHold TTL** masih open (`TBC-PAY-EXPIRY-01`); keputusan `1 jam` JSON vs `10 menit` hold guide belum reconcile.
4. **Operational footprint** Midtrans (webhook receiver, secret rotation, retry policy, dead-letter, reconciliation report) memerlukan engineering time yang dapat dialokasikan ke fitur lain yang lebih dekat dengan value launch.
5. **Volume launch rendah.** MVP untuk psikolog tunggal (Fuja) dengan satu layanan (SERAYA PULANG); volume transaksi rendah sehingga throughput gateway bukan bottleneck, sementara Admin tetap harus handle konfirmasi/refund secara manual karena cancellation/refund sudah case-by-case via WhatsApp (`ADR 0066`, `ADR 0076`).

Tim memilih **menghilangkan payment gateway dari launch path** dan menggantinya dengan **WhatsApp manual payment**: klien menerima invoice via WhatsApp, membayar manual, Admin memverifikasi bukti bayar di workspace, Booking confirmed. Midtrans tetap deferred dan dapat diaktifkan di iterasi berikutnya tanpa menyentuh domain model Booking/PackagePurchase/Payment — boundary `PaymentGatewayAdapter` tetap dipakai (dengan implementasi `null` / `noop`), dan field `Payment.provider` ditambah nilai baru `manual_whatsapp` untuk mengidentifikasi jalur ini.

## Diskusi multi-perspektif

### Privacy (klinis/etis)

- Bukti pembayaran (screenshot mutasi bank, foto struk) berisi nama pengirim dan nomor rekening — ini data **non-clinical** yang boleh disimpan dalam retention category Payment/Refund per `IMPLEMENTATION-GUIDE.md §9.1`. `payment_proof.evidence_url` menunjuk ke object storage (Cloudflare R2 atau equivalent) yang tunduk pada retention policy `Payment/PaymentEvent/RefundAction` (audit/legal policy).
- Tidak ada nama akun, nomor rekening pengirim, atau message body WhatsApp yang boleh tersimpan sebagai clinical record. `evidence_note` Admin terbatas pada field operasional (nama pengirim jika berbeda dari nama kontak, waktu transfer jika relevan untuk dispute, kode referensi bank). Field ini tunduk pada data minimization.
- Consent tidak berubah: `ConsentRecord` yang sudah diverifikasi saat checkout tetap berlaku; WhatsApp manual payment adalah perubahan metode settlement, bukan perubahan consent.

### Operations (admin/finance)

- **Admin verifikasi SLA**: perlu didefinisikan. Default aman: Admin verifikasi dalam jam kerja normal, target `≤ 24 jam` sejak bukti diterima. `TBC-PAY-MANUAL-01` mengangkat ini.
- **Dispute / re-verify**: jika bukti pembayaran tidak jelas atau nominal tidak sesuai, Admin `reject` `payment_proof` row dan menghubungi klien via WhatsApp untuk klarifikasi. Klien mengirim bukti kedua; Admin `verify` row baru. Original `payment_proof` (status `rejected`) immutable; row baru memiliki `correction_of` linkage.
- **Nominal tidak sesuai**: jika Admin menerima bukti dengan nominal lebih kecil dari `OfferSnapshot.amount_cents`, Admin boleh (a) reject dan minta klien transfer sisa, (b) reject dan `cancelled` Booking per cancellation flow. Tidak ada partial payment / partial confirm di launch.
- **Refund manual**: setelah Admin `DecideCancellation approve`, `RefundAction full_refund` di-execute off-platform (transfer balik ke rekening klien). Admin menandai `RefundAction.status = 'completed'` setelah transfer selesai; `provider_reference` adalah `"manual_bank_transfer"` + tanggal + referensi internal.
- **Reporting**: financial reporting membaca `Payment.settled_at` (canonical), dengan `Payment.provider = 'manual_whatsapp'` memisahkan jalur settlement manual dari gateway. `payment_proof` table menyediakan audit trail per verifikasi (siapa, kapan, bukti apa).
- **Reconciliation**: tidak ada provider dashboard; source of truth adalah `payment_proof` + Admin WhatsApp conversation log (off-system, retention terpisah). Tidak ada automatic reconciliation script; Admin adalah operator.

### Engineering (aggregate & schema)

- **No provider integration**: tidak ada `createCheckout`, tidak ada `verifyNotification` (signature), tidak ada webhook receiver. Adapter `PaymentGatewayAdapter` dapat di-stub dengan implementasi `ManualWhatsappAdapter` yang return `CheckoutCreated { provider: 'manual_whatsapp', providerIntentId: bookingId, snapToken: null, snapRedirectUrl: null, expiresAt: null }` — semua field opsional menjadi `null`, dan aplikasi tidak memanggil endpoint apa pun ke provider eksternal.
- **Booking state machine disederhanakan**:

  ```
  pending_manual_payment
      │  (klien menekan "Saya sudah bayar" → opsional; atau otomatis setelah invoice dikirim)
      ▼
  awaiting_confirmation
      │  (Admin Mark as paid dengan payment_proof verified)
      ▼
  confirmed
      │
      ▼
  (lifecycle lanjut: Appointment scheduling, package entitlement, etc.)
  ```

  Terminal: `cancelled` (via CancellationRequest approve, atau Admin manual cancel jika bukti tidak datang sama sekali dalam retention window).

- **`payment_proof` schema** (D1/SQLite + Postgres equivalent):

  ```sql
  CREATE TABLE payment_proof (
    id                          TEXT PRIMARY KEY,
    booking_id                  TEXT NOT NULL REFERENCES booking(id),
    payment_method              TEXT NOT NULL CHECK (payment_method IN ('bank_transfer','va','qris_manual')),
    amount_idr                  INTEGER NOT NULL CHECK (amount_idr > 0),
    evidence_url                TEXT,                 -- nullable; URL ke uploaded screenshot di R2
    evidence_note               TEXT,                 -- nullable; Admin free-text, max ~500 char
    verified_by_membership_id   TEXT NOT NULL REFERENCES staff_membership(id),
    verified_at                 TEXT NOT NULL,       -- ISO timestamp Asia/Jakarta
    status                      TEXT NOT NULL CHECK (status IN ('verified','rejected')),
    correction_of               TEXT REFERENCES payment_proof(id),  -- nullable; jika ini re-verify dari row rejected
    created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE INDEX idx_payment_proof_booking_id ON payment_proof(booking_id);
  CREATE INDEX idx_payment_proof_verified_at ON payment_proof(verified_at);
  ```

  Append-only: tidak ada `UPDATE` untuk field `id`, `booking_id`, `payment_method`, `amount_idr`, `verified_by_membership_id`, `verified_at`. Status boleh bertransisi `verified → rejected` (reject dengan alasan) atau `verified → supersede` (re-verify dengan row baru). Setiap transisi adalah `payment_proof` row baru + `audit_record`.

- **Atomicity**: `MarkAsPaid` command dalam satu transaction: (1) `INSERT INTO payment_proof ...`; (2) `UPDATE booking SET status = 'confirmed', payment_proof_id = ...`; (3) `UPDATE payment SET status = 'paid', settled_at = now(), provider = 'manual_whatsapp'`; (4) emit outbox event untuk email konfirmasi; (5) `INSERT INTO audit_record ...`. Semua atomic. Crash di tengah = rollback + retry-safe (idempotent karena `payment_proof.id` di-generate deterministic dari `booking_id + sequence`).
- **Settlement uniqueness tetap berlaku**: at-most-one `Payment` dengan `status = 'paid'` per `Booking.id` (`ADR 0093 §1.2`). Unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` tetap aktif. Manual flow hanya menyentuh `Payment` row existing (yang sudah di-insert saat booking creation dengan `status = 'pending_manual_payment'`).
- **Idempotency dari MarkAsPaid**: tombol Mark as paid menghasilkan command yang menerima `idempotency_key = booking_id`. Re-klik tombol dalam window pendek (mis. network retry) tidak membuat `payment_proof` row kedua.

### UX (checkout & Admin)

- **Client side (booking confirmation page setelah checkout submit)**:
  - Tampilan: "Booking Anda diterima. Silakan selesaikan pembayaran dalam **24 jam** dengan detail pada invoice terlampir."
  - Tombol: **Download Invoice (PDF)** — generate PDF dari template (booking ID, amount, rekening/VA/QRIS instructions, expiry).
  - Tombol: **Copy Invoice Text** — plain text version siap di-paste ke WhatsApp chat dengan Admin.
  - Tombol: **Kirim via WhatsApp** — `wa.me/<admin_number>?text=<encoded_invoice_text>` deep link.
  - Tampilan: "Setelah membayar, mohon kirim bukti transfer ke Admin WhatsApp ini. Kami akan konfirmasi paling lambat dalam 1 hari kerja."
  - State polling: page poll `/api/booking/{id}/status` setiap 30 detik; ketika `status = 'confirmed'`, tampilkan "Pembayaran confirmed. Janji temu Anda sudah terjadwal."
- **Admin workspace (Booking detail page)**:
  - Tampilan: `Booking` summary + `payment_proof` history (list).
  - Tombol: **Mark as Paid** — membuka modal dengan form: `payment_method` (dropdown), `amount_idr` (auto-fill dari OfferSnapshot, editable), `evidence_url` (file upload ke R2), `evidence_note` (textarea), submit.
  - Tombol: **Reject Proof** — jika ada bukti meragukan atau nominal salah, Admin reject existing `payment_proof` row dengan reason note; klien diminta kirim bukti ulang. Reject membuka input row baru (re-verify path).
  - Tombol: **Cancel Booking** — Admin manual cancel jika klien tidak mengirim bukti dalam retention window; CancellationDecision append-only dengan reason `client_no_payment_proof`.
- **Invoice generation**:
  - **PDF**: render dari template (`booking_id`, `client_name`, `service_offering_name`, `package_session_count` (nullable), `amount_idr`, `currency = 'IDR'`, `payment_instructions` (bank account / VA number / QRIS image), `expiry_at`, `support_contact_whatsapp`). Generated server-side; served via signed URL dengan retention mengikuti Booking retention.
  - **Plain text**: copy yang sama dalam plain text format, ready untuk di-forward via WhatsApp. Template single-language (Bahasa Indonesia untuk launch).
  - **Payment instructions** di-hardcode di Admin CMS config (bank account number, VA number, QRIS image URL). Admin mengelola via workspace; tidak di-hardcode di code.

## Decision

### 1. Launch payment surface: WhatsApp manual

| Concern | Decision |
|---|---|
| Payment gateway | **None.** Tidak ada Midtrans, Xendit, atau gateway lain di launch. |
| Payment methods | `bank_transfer` (manual ke rekening Seraya), `va` (manual ke nomor VA Seraya), `qris_manual` (scan QRIS statis Seraya). Semuanya **off-platform**. |
| Invoice delivery | WhatsApp. PDF + plain text. Client dapat download / copy / forward. |
| Payment confirmation | **Admin manual** via "Mark as Paid" button di Admin workspace. |
| Evidence | `payment_proof.evidence_url` (uploaded screenshot) atau `payment_proof.evidence_note` (free-text Admin note). Either or both. |
| Refund | Off-platform transfer balik. `RefundAction` tetap `full_refund` / `no_refund` per `ADR 0077`. `provider_reference = "manual_bank_transfer"`. |
| Midtrans deferred | `ADR 0068` dan `ADR 0069` **superseded for MVP launch**; kept as future option. Re-activation memerlukan ADR baru. |

### 2. Booking state machine (payment-relevant)

```
pending_manual_payment   -- booking + payment row created, invoice belum dikirim
   │
   │  (system: invoice generated dan tersedia untuk download/share)
   │  -- state tetap pending_manual_payment sampai klien "konfirmasi kirim" atau Admin "Mark as Paid"
   ▼
awaiting_confirmation     -- klien mengklaim sudah bayar / Admin melihat bukti masuk
   │
   │  (Admin Mark as Paid → payment_proof verified, payment.status = 'paid', booking.status = 'confirmed')
   ▼
confirmed                 -- terminal untuk payment flow; lifecycle Appointment / Package / Cancellation berlanjut
   │
   │  (alternative path: CancellationRequest approve → cancelled, atau Admin manual cancel → cancelled)
   ▼
cancelled                 -- terminal; RefundAction terpisah jika applicable
```

| State | Trigger to enter | Side effects |
|---|---|---|
| `pending_manual_payment` | Booking created (checkout submit). | `payment` row `status = 'pending_manual_payment'`, `provider = 'manual_whatsapp'`, `providerIntentId = bookingId`. SlotHold active (10 min default, `ADR 0094` cutoff). Invoice generated on-demand via API. |
| `awaiting_confirmation` | Klien klik "Saya sudah bayar" di confirmation page, **atau** Admin melihat bukti masuk via WhatsApp dan toggle state. | Email reminder ke Admin (`admin_invoice_sent`). SlotHold **released** (slot di-release ke available pool; reacquire di-handle saat Mark as Paid). |
| `confirmed` | Admin Mark as Paid → `payment_proof` verified. | Atomic: `payment_proof` insert, `payment.status = 'paid'`, `payment.settled_at = now()`, `booking.status = 'confirmed'`, outbox event `booking_confirmed`, email ke klien `payment_received`. Untuk package: `PackagePurchase` created dengan `SessionEntitlement #1.state = 'scheduled'` (slot reacquire atomic per `ADR 0091`) atau `'pending_schedule'` (slot reacquire gagal, Admin resolution via existing reconciliation `ADR 0067`). |
| `cancelled` | CancellationRequest approve, **atau** Admin manual cancel (no proof dalam retention window). | Existing cancellation matrix per `ADR 0095`. Slot released per atomic effects. `RefundAction` terpisah jika applicable. |

**Tidak ada state `paid_late_*`** untuk manual flow (tidak ada provider late event). Package late-scheduling mengikuti pola `ADR 0093 §5` Option A: jika slot reacquire gagal saat Mark as Paid, `SessionEntitlement #1.state = 'pending_schedule'` dan `PackagePurchase.requires_first_session_scheduling = true` (sama seperti paid_late package).

### 3. `payment_proof` table (final schema)

Fields (semua required kecuali nullable ditandai):

| Field | Type | Nullable | Constraint / Notes |
|---|---|---|---|
| `id` | TEXT PK | no | Deterministic: `pp_<booking_id>_<sequence>` (sequence increments untuk re-verify) |
| `booking_id` | TEXT FK → `booking.id` | no | ON DELETE RESTRICT |
| `payment_method` | TEXT | no | ENUM: `bank_transfer` \| `va` \| `qris_manual` |
| `amount_idr` | INTEGER | no | Integer minor unit (rupiah penuh dalam hal ini, bukan sen). Wajib `> 0`. |
| `evidence_url` | TEXT | yes | URL ke R2 / object storage. Signed URL dengan retention mengikuti Booking. |
| `evidence_note` | TEXT | yes | Free-text Admin note. Max 500 char (config). Contoh: nama pengirim, waktu transfer, kode referensi. |
| `verified_by_membership_id` | TEXT FK → `staff_membership.id` | no | Admin yang memverifikasi. |
| `verified_at` | TEXT (ISO 8601 Asia/Jakarta) | no | Timestamp verifikasi. |
| `status` | TEXT | no | ENUM: `verified` \| `rejected` |
| `correction_of` | TEXT FK → `payment_proof.id` | yes | Jika row ini adalah re-verify dari row rejected sebelumnya. |
| `created_at` | TEXT (ISO 8601) | no | Default now(). |

**Append-only invariant**: tidak ada `UPDATE` pada `id`, `booking_id`, `payment_method`, `amount_idr`, `verified_by_membership_id`, `verified_at`, `created_at`. `status` boleh ber-transisi dari `verified → rejected` (via Admin reject dengan reason) — ini di-record sebagai `payment_proof_rejection` audit event, bukan in-place update.

**Idempotency**: `MarkAsPaid` command menerima `idempotency_key`. Re-submit dengan key yang sama return existing `payment_proof` row (no duplicate insert).

**Re-verify path**:
1. Admin menerima bukti baru dari klien (mis. bukti pertama blur, klien kirim ulang).
2. Admin reject existing `payment_proof` row (status `verified → rejected`) dengan reason note.
3. Admin create new `payment_proof` row dengan `status = 'verified'` dan `correction_of = <original_row_id>`.
4. Original row immutable; row baru menjadi canonical.

**Multiple verified rows**: hanya **satu** `payment_proof` dengan `status = 'verified'` per `booking_id` pada satu waktu (enforced by partial unique index `payment_proof(booking_id) WHERE status = 'verified'`). Reject + new verified row: atomic transaction.

### 4. Admin workspace — "Mark as paid" command

**Command**: `MarkAsPaid`

| Aspect | Spec |
|---|---|
| Input | `booking_id`, `payment_method`, `amount_idr`, `evidence_url` (nullable), `evidence_note` (nullable), `actor_membership_id` (dari Admin session) |
| Precondition | `booking.status IN ('pending_manual_payment', 'awaiting_confirmation')`; `payment.status = 'pending_manual_payment'`; `payment.provider = 'manual_whatsapp'`; tidak ada `payment_proof` existing dengan `status = 'verified'` untuk `booking_id` ini |
| Authorization | Admin only (StaffMembership.role = 'admin') |
| Atomic effects (single transaction) | (1) `INSERT INTO payment_proof ...`; (2) `UPDATE payment SET status = 'paid', settled_at = now() WHERE id = ?`; (3) `UPDATE booking SET status = 'confirmed' WHERE id = ?`; (4) untuk package: `INSERT INTO package_purchase ...` + ordered `SessionEntitlement` rows; attempt slot reacquire per `ADR 0091` (`SessionEntitlement #1.state = 'scheduled'` jika sukses, `'pending_schedule'` jika gagal); (5) `INSERT INTO audit_record (action='mark_as_paid', before='pending_manual_payment|awaiting_confirmation', after='confirmed', actor_membership_id, reason_code='manual_whatsapp_verified')`; (6) outbox: `booking_confirmed`, `payment_received` |
| Idempotency | `idempotency_key = booking_id`; re-submit dengan key sama = no-op + return existing `payment_proof.id` |
| Output | `payment_proof_id`, `booking.status = 'confirmed'`, `payment.status = 'paid'`, `payment.settled_at` |

**Command**: `RejectPaymentProof`

| Aspect | Spec |
|---|---|
| Input | `payment_proof_id`, `reason_note` (required, max 500 char), `actor_membership_id` |
| Precondition | `payment_proof.status = 'verified'`; `booking.status = 'confirmed'` |
| Effect | `payment_proof.status = 'rejected'` (audit-logged). **Tidak** mengubah `booking.status` atau `payment.status`. Booking tetap confirmed secara financial, tetapi Admin follow-up dengan klien untuk klarifikasi. |
| Follow-up | Admin meminta bukti baru via WhatsApp; jika diterima, Admin create new `payment_proof` row dengan `correction_of = <original_row_id>`. Original row immutable history. |

**Command**: `MarkAwaitingConfirmation` (Admin melihat bukti masuk via WhatsApp, toggle state sebelum verify)

| Aspect | Spec |
|---|---|
| Input | `booking_id`, `actor_membership_id` |
| Precondition | `booking.status = 'pending_manual_payment'` |
| Effect | `booking.status = 'awaiting_confirmation'`. SlotHold released (slot kembali ke available pool). Tidak menggerakkan payment. |
| Use case | Admin ingin flag Booking sebagai "sudah ada bukti masuk, akan segera diverifikasi" tanpa langsung mark as paid. |

### 5. Invoice generation

**PDF invoice template**:

```
┌─────────────────────────────────────────────────┐
│             SERAYA PSIKOLOGI — INVOICE          │
├─────────────────────────────────────────────────┤
│ Invoice ID:     INV-<booking_id>                │
│ Issued:         <YYYY-MM-DD HH:mm WIB>          │
│ Due:            <YYYY-MM-DD HH:mm WIB> +24h     │
│                                                  │
│ Client:         <client_name>                   │
│ Email:          <client_email>                  │
│ Booking ID:     <booking_id>                    │
│ Service:        <service_offering_name>         │
│ Mode:           <online|offline>                │
│ Sessions:       <1 | 2 | 3 | couple-3>          │
│ Amount:         Rp <amount formatted>           │
│                                                  │
│ ─── Payment Instructions ───                    │
│ Method: <bank_transfer|va|qris_manual>          │
│ <bank_name>: <account_number>                   │
│ a/n: <account_holder>                           │
│ <VA number>  (if applicable)                    │
│ <QRIS image QR link>  (if applicable)           │
│                                                  │
│ Setelah membayar, mohon kirim bukti              │
│ transfer ke WhatsApp Admin:                     │
│ wa.me/<admin_number>                             │
│                                                  │
│ Pembayaran akan dikonfirmasi dalam              │
│ 1 hari kerja setelah bukti diterima.            │
└─────────────────────────────────────────────────┘
```

**Plain text invoice template** (tersedia via tombol "Copy Invoice Text"):

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

**Generation rules**:
- Invoice dapat di-generate kapan saja saat `booking.status IN ('pending_manual_payment', 'awaiting_confirmation')`.
- PDF di-render server-side via template engine (mis. headless Chromium → PDF, atau `puppeteer`).
- Plain text adalah static template dengan field substitution.
- Invoice **tidak** include clinical information, contact phone (jika ada), atau BookingParticipant detail untuk couple — hanya identitas payer.
- Invoice di-cache per booking_id (regenerate hanya jika `OfferSnapshot` berubah, yang seharusnya tidak terjadi karena snapshot immutable).
- Signed URL dengan retention mengikuti Booking retention (12 bulan setelah last active service per `ADR 0083`).

**Payment instructions** di Admin CMS config (bukan hardcode):
- `bank_transfer`: `bank_name`, `account_number`, `account_holder` (≥ 1 entry)
- `va`: `va_number` (≥ 1 entry per bank jika multiple)
- `qris_manual`: `qris_image_url` (signed URL, image QRIS statis)

Admin mengelola via Admin CMS → Payment Settings page. Default fallback saat kosong: tampilkan error "Payment instructions not configured. Hubungi Admin." (graceful failure, tidak expose empty state ke client).

### 6. Slot reacquisition saat Mark as Paid

Mengikuti `ADR 0093 §5` (Option A) — atomic `CapacityReservation` claim per `ADR 0091`:

- **Single-session Booking**: Mark as Paid → slot reacquire attempt → jika sukses, `Appointment` confirmed; jika gagal (overlap), Admin resolution via existing reconciliation flow (`ADR 0067`). Booking status `confirmed` dalam kedua kasus (Payment settled); `Appointment` mungkin `pending_schedule` (reconcile) atau `confirmed`.
- **Package Booking**: Mark as Paid → slot reacquire attempt untuk `SessionEntitlement #1` → jika sukses, `SessionEntitlement #1.state = 'scheduled'` + `Appointment` confirmed; jika gagal, `SessionEntitlement #1.state = 'pending_schedule'` + `PackagePurchase.requires_first_session_scheduling = true`. Admin resolution: schedule alternative, atau `full_refund` (close package), atau hold via WhatsApp.

**Critical**: ini adalah satu-satunya titik di mana slot di-acquire untuk Booking manual flow. SlotHold released saat `awaiting_confirmation` enter; reacquire terjadi di Mark as Paid. Ini **bukan** late payment (hold sudah expired), melainkan **normal path** — hold di-release sengaja saat menunggu bukti.

### 7. Audit trail

Setiap perubahan state Booking / Payment / payment_proof di-log ke `audit_record`:

| Action | Before | After | Actor | Reason code |
|---|---|---|---|---|
| `booking_created` | (none) | `pending_manual_payment` | client (guest) | `checkout_submit` |
| `awaiting_confirmation_set` | `pending_manual_payment` | `awaiting_confirmation` | admin or client | `proof_received` |
| `mark_as_paid` | `pending_manual_payment` or `awaiting_confirmation` | `confirmed` | admin | `manual_whatsapp_verified` |
| `payment_proof_rejected` | `verified` (payment_proof row) | `rejected` | admin | `proof_unclear` / `amount_mismatch` / `other:<note>` |
| `payment_proof_re_verified` | (none) | (new row `verified` with `correction_of`) | admin | `manual_whatsapp_re_verified` |
| `booking_cancelled` | `pending_manual_payment` / `awaiting_confirmation` | `cancelled` | admin | `client_no_payment_proof` / `client_requested` / `other:<note>` |

Tidak ada rewrite in-place. `audit_record` append-only per `IMPLEMENTATION-GUIDE.md §8.1`.

### 8. Refund (off-platform)

Mengikuti `ADR 0077` vocabulary (`full_refund` / `no_refund`):

- `RefundAction` row di-create oleh Admin di Admin Cancellation & Refund Workspace setelah `CancellationDecision approve`.
- `RefundAction.provider_reference = "manual_bank_transfer:<YYYY-MM-DD>:<admin_internal_ref>"`.
- `RefundAction.status` transitions: `pending` → `completed` (setelah Admin konfirmasi transfer balik selesai) atau `failed` (jika transfer gagal, perlu retry / bank berbeda).
- Tidak ada automatic disbursement. Admin adalah operator.
- `Payment.status` summary update via derived projection (`refunded_full` jika RefundAction `completed` dengan `full_refund`) — bukan in-place rewrite historical.

### 9. Settlement uniqueness tetap berlaku

`ADR 0093 §1.2` invariant **tetap aktif**: at-most-one `Payment` dengan `status = 'paid'` per `Booking.id`. Unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL`. Mark as Paid attempt kedua (race atau double-click) → DB constraint reject + audit log `mark_as_paid_duplicate_attempt` + return existing payment_proof.

## Consequences

Positive:

- **Tidak ada payment gateway dependency** di launch. Menghilangkan 4 blocker operasional (Midtrans onboarding, sandbox evidence, provider expiry alignment, webhook receiver infrastructure).
- **SlotHold ↔ payment expiry invariant** selesai secara default: tidak ada provider expiry karena tidak ada provider.
- **Lower engineering footprint**: tidak ada `createCheckout`, tidak ada signature verification, tidak ada webhook handler, tidak ada retry/dead-letter, tidak ada provider reconciliation script. Adapter `PaymentGatewayAdapter` di-stub atau dihapus dari dependency tree launch.
- **Financial transparency**: `payment_proof` table adalah audit trail natural per verifikasi (siapa Admin, kapan, bukti apa). Tidak perlu parsing provider dashboard.
- **Operational flexibility**: Admin dapat `reject` lalu `re-verify` tanpa batasan teknis; dispute handling eksplisit di workflow.
- **Cost**: zero payment gateway fee (vs Midtrans 0.7%–2% per transaksi). Untuk volume launch rendah, ini material.

Costs and constraints:

- **Admin overhead**: setiap transaksi memerlukan Admin manual verification. Untuk MVP volume rendah ini acceptable; untuk scale perlu automasi.
- **Client friction**: klien harus (a) download invoice atau copy text, (b) buka mobile banking / e-wallet, (c) transfer manual, (d) screenshot bukti, (e) kirim ke Admin WhatsApp. Lebih banyak langkah dibanding Snap checkout.
- **Tidak ada real-time confirmation**: ada delay antara bukti dikirim dan `booking.status = 'confirmed'`. Email konfirmasi `payment_received` dikirim hanya setelah Mark as Paid.
- **Slot reacquire race**: saat `awaiting_confirmation`, slot di-release. Saat Mark as Paid, reacquire attempt mungkin gagal (slot sudah diambil orang lain via jalur lain, mis. booking berbeda). Untuk single-session: Admin resolution via `ADR 0067`. Untuk package: `SessionEntitlement #1.state = 'pending_schedule'`.
- **No idempotency via provider event**: replay safety harus di-handle di level command (`MarkAsPaid` dengan `idempotency_key`), bukan via webhook idempotency record (`ADR 0093 §3`). Berlaku: `payment_event_idempotency` table tidak diperlukan untuk manual flow, dapat di-skip.
- **Midtrans re-activation memerlukan ADR baru**: jika post-MVP Midtrans diaktifkan kembali, harus ada ADR yang menjelaskan transisi dari manual ke gateway — apakah existing Booking manual-flow di-migrasi (tidak boleh per append-only invariant), atau Midtrans hanya untuk Booking baru (forward-only), atau full reset. Out of scope untuk ADR ini.

## Open follow-up

1. `TBC-PAY-MANUAL-01` — **Admin verification SLA, payment_proof retention policy, dispute handling escalation path**. Default aman untuk launch: verification ≤ 24 jam kerja, retention mengikuti Booking (12 bulan), dispute via WhatsApp re-verify path. Formal policy text menyusul; bukan blocker untuk launch.
2. Payment instructions di Admin CMS (bank account / VA / QRIS) — initial setup oleh Admin sebelum go-live. Bukan ADR concern; operational checklist.
3. PDF rendering library choice (puppeteer, pdfkit, dll.) — implementation detail, bukan domain decision.
4. Post-MVP: kapan dan bagaimana Midtrans diaktifkan kembali. ADR baru akan dibutuhkan; tidak dibahas di sini.

## Supersedes

- `ADR 0068-midtrans-snap-launch-gateway.md` — Midtrans Snap tidak lagi launch path. Status updated to **"Superseded for MVP launch; kept as future option. WhatsApp manual payment is launch path per ADR 0097."**
- `ADR 0069-launch-payment-methods.md` — QRIS / bank transfer / VA tetap launch-eligible **methods**, tetapi delivery-nya manual off-platform (bukan via Midtrans Snap). Status updated to **"Superseded for MVP launch; payment methods retained as off-platform manual settlement per ADR 0097."**

## Reference

- `ADR 0066` — WhatsApp optional manual support boundary
- `ADR 0076` — no automatic cancellation cutoff; Admin case-by-case
- `ADR 0077` — `RefundAction` vocabulary `full_refund` / `no_refund`
- `ADR 0090` — `BookingParticipant` / `AppointmentParticipant` couple model (couple invoice hides participant detail)
- `ADR 0091` — `CapacityReservation` + TransitionBuffer (slot reacquire atomic)
- `ADR 0093` — settlement uniqueness invariant (at-most-one paid Payment per Booking)
- `ADR 0094` — intake schema (Nama lengkap, Email wajib, Nomor HP opsional, Consent version)
- `ADR 0095` — package cancellation matrix + outcome race
- `IMPLEMENTATION-GUIDE.md §7` — patched to reflect manual flow + 7.1 invoice generation + 7.2 mark-as-paid + 7.3 payment_proof audit
- `DOMAIN-MODEL.md` Payment and refund section — patched with new state machine + payment_proof table
- `PRD-GUIDELINE-REVIEW.md` TBC register — `TBC-PAY-01` redirect to ADR 0097; Midtrans-specific evidence deferred; `TBC-PAY-MANUAL-01` added for operational concerns
- `CONTEXT.md` glossary — patched to add `payment_proof`, `awaiting_confirmation` state, and mark-as-paid terminology
