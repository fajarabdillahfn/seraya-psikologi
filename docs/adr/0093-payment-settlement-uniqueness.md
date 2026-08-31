# 93. Payment Settlement Uniqueness and `paid_late` Package Effects

## Status

Accepted for MVP. Closes `TBC-PAY-SETTLEMENT-01` from `PRD-GUIDELINE-REVIEW.md` (Round 1 P1-10 and Round 2 R2 follow-up). Implements the `at-most-one successful settlement per Booking/purchase intent` invariant that the existing idempotency-by-provider-event-id (mentioned in `ADR 0059` and `CONTEXT.md:41`) does not catch, and defines the `paid_late` package creation effects left open by `ADR 0059` lines 13–20. Production launch still requires `TBC-STACK-01` (Worker + D1 vs Supabase + Postgres) to be closed before any migration is executed; the SQL DDL in §6 is written for the Postgres family with the D1/SQLite equivalent in §7.

## Ringkasan eksekutif (Bahasa Indonesia)

- **At-most-one successful settlement per Booking/purchase intent.** Sebuah `Booking` (atau `PackagePurchase` purchase intent) hanya boleh memiliki **tepat satu** `Payment` dengan `settled_at IS NOT NULL` dan `status = 'paid'`. Invariant ini ditegakkan oleh **unique partial index** pada `payment(booking_id) WHERE settled_at IS NOT NULL AND status = 'paid'` (Postgres) atau unique partial index di D1/SQLite. Dua `PaymentEvent` berbeda yang sama-sama status `capture`/`settlement` tidak boleh menghasilkan dua `Payment` settled.
- **Verifikasi amount/currency/order/merchant wajib**, bukan hanya authenticity/signature. `PaymentEvent` yang verified oleh signature saja belum cukup; nilai `gross_amount`, `currency`, `order_id` (matching `Booking.id`), dan `merchant_id` (matching configured Midtrans merchant) harus sama dengan `OfferSnapshot` dan `Booking.snapshotted_amount`. Ketidakcocokan → `PaymentEvent` di-discard (logged sebagai `mismatch`), tidak menghasilkan `Payment` baru dan tidak menggerakkan Booking/Package state.
- **Idempotency key scope: lifetime, payload fingerprint.** Idempotency record (`payment_event_idempotency`) keyed by `(provider_event_id, payment_intent_id)` adalah lifetime (tidak pernah di-purge selama `PaymentEvent` masih ada). Payload fingerprint (`sha256(canonical_payload)`) disimpan di side record: same-key/same-payload → return existing result; same-key/different-payload → typed failure `idempotency_key_collision`, tidak pernah diam-diam overwrite.
- **Out-of-order / repeated-status / reversal mapping.** Adapter memetakan `capture`/`settlement` (final success), `pending` (transient), `deny`/`cancel`/`expire`/`failure` (terminal failure), `refund`/`chargeback`/`partial_refund` (reversal — ignored at `Payment` level karena refund adalah `RefundAction` terpisah), dan `challenge`/`fraud` (status investigasi, tidak menggerakkan state). Pengulangan `capture` untuk satu order yang sudah settled adalah no-op (Payment idempotent di level `settled_at`).
- **Crash window strategy.** Tiga window berbeda ditangani eksplisit: (a) antara provider API call dan persistence (optimistic insert `Payment` `status=pending` + idempotency record atomic), (b) antara verified webhook dan state transition (webhook handler transaksi: insert idempotency record → insert `PaymentEvent` → apply state transition → emit outbox, semua dalam satu transaction), (c) antara state transition dan outbox delivery (transactional outbox pattern; outbox dispatcher best-effort retry dengan idempotency).
- **`paid_late` package: Option A dipilih.** `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` dibuat **saat webhook verified** (tepat ketika `Payment` di-settle), dengan first session scheduled atau held mengikuti state booking asli. Jika slot asli tidak dapat direacquire (overlap), `PackagePurchase` tetap dibuat dengan `status = paid_late` dan first `SessionEntitlement` di-set `state = pending_schedule`; `Appointment` asli dimark `cancelled_replaced_by_paid_late` atau tetap `pending_payment` (existing). Admin resolution flow men-decide refund / reversal / client-approved alternative (lihat §5).

## Context

`CONTEXT.md:41` mengizinkan multiple payment attempts per Booking. `ADR 0059` dan praktik idempotency-by-provider-event-id (`IMPLEMENTATION-GUIDE.md §8.2`) menjamin webhook replay aman, namun **tidak** mencegah dua `Payment` berbeda (misal dua checkout attempt ke Snap yang masing-masing membuat `order_id` berbeda, atau duplicate routing path) sama-sama sukses untuk `Booking` yang sama. Risiko: double-paid capture, double-issued `PackagePurchase`, double-confirmed `Appointment`, atau financial truth mismatch yang harus direkonsiliasi manual.

Untuk package, `ADR 0059` line 13–18 sudah memutuskan `paid_late`/reconciliation path untuk **single-session Booking**, dan line 17 menyebutkan "reacquire original slot atomically jika masih free". Untuk **package Booking**, `ADR 0059` tidak menjawab apakah `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` dibuat pada saat webhook verified (Option A), ditunda sampai Admin resolution (Option B), atau dibuat dengan first session held sebagai `pending_schedule` (Option C — turunan dari A). Ticket #5 mengangkat keputusan ini dan meminta closure eksplisit.

Ticket #5 acceptance criteria: (1) integration test dua webhook sukses berbeda ID untuk Booking sama → hanya satu yang settle, yang lain masuk reconciliation; (2) integration test paid-late package → Admin resolution flow menciptakan `PackagePurchase` dengan first session scheduled atau held untuk Admin manual scheduling. ADR ini menjawab kedua acceptance criteria dan menambahkan uniqueness untuk amount/currency/order/merchant, idempotency collision handling, dan crash-window safety.

## Diskusi multi-perspektif

### Privacy (klinis/etis)

- Duplicate settlement tidak boleh bocor keluar sebagai "double-billed client"; hanyalah reconciliation record internal. Notifikasi konfirmasi pembayaran mengikuti existing rule: satu email konfirmasi per `Booking` (atau per `PackagePurchase`), dikirim setelah uniqueness check passed. Tidak ada email tambahan untuk duplicate-payment-as-noop.
- Late payment dan duplicate payment tidak boleh menunda `ConsentRecord` activation. Consent tetap mengikuti `Booking`/participant timeline, bukan payment timeline. Verified webhook menggerakkan state Booking/Appointment/PackagePurchase tanpa menunggu consent verifikasi ulang (consent sudah diverifikasi saat checkout).
- `paid_late` package yang dibuat dengan `first_session_entitlement.state = pending_schedule` tidak terekspos ke klien sebelum Admin resolution; klien melihat "paket Anda sudah aktif, kami akan menghubungi untuk jadwal sesi pertama" (atau equivalent copy yang tidak menjanjikan slot spesifik). Klien tidak boleh melihat "kami akan re-acquire slot Anda".

### Operations (admin/finance)

- Admin workspace perlu membedakan tiga status `paid_late`:
  1. `paid_late_slot_reacquired` (Booking single-session atau package first session) → original slot berhasil di-claim atomically, Appointment confirmed normal.
  2. `paid_late_slot_unavailable` (Booking single-session) → tidak ada Appointment; Payment tetap paid; Admin resolusi via refund atau hold.
  3. `paid_late_first_session_pending` (package) → `PackagePurchase` paid, `SessionEntitlement #1` `state = pending_schedule`, Admin resolusi via scheduling alternative atau refund per kasus.
- Duplicate-payment reconciliation record (`payment_reconciliation`) membawa reason `duplicate_provider_event`, `payload_mismatch`, atau `idempotency_collision` agar Admin dapat review cepat. Tidak otomatis refund — Admin memutuskan setelah cek Midtrans dashboard dan Booking/Purchase context.
- Financial reporting membaca `Payment.settled_at` (bukan `PaymentEvent.status`); oleh karena itu uniqueness constraint pada `Payment.settled_at IS NOT NULL` adalah sumber kebenaran finansial.

### Engineering (aggregate & schema)

- **Atomicity boundary**: verifikasi webhook, insert `Payment` settled, insert `PaymentEvent`, state transition (Booking/Appointment/PackagePurchase/Entitlement), dan outbox event harus berada dalam satu application transaction. Crash window dipecah menjadi tiga dan ditangani di §4.
- **Payment vs PaymentEvent separation**: `Payment` adalah current projection dengan `status`, `settled_at`, `booking_id`, `amount_cents`, `currency`, `provider`, `provider_payment_id`; `PaymentEvent` adalah append-only log dengan `provider_event_id`, `event_type`, `payload_hash`, `verified_at`, `raw_payload` (redacted). Duplicate event harus no-op insert (idempotency) atau insert new `PaymentEvent` row + no-op transition (jika sudah settled).
- **Idempotency record** keyed by `(provider_event_id, payment_intent_id)` dan `payload_hash`. Lifetime scope karena `PaymentEvent` juga append-only. Tidak ada TTL expiry.
- **Crash window (a) — antara `createCheckout` API call dan persistence**: optimistik insert `Payment` `status = 'pending'` + insert `payment_event_idempotency` keyed by `(provider_event_id = null, intent_key = createCheckout_correlation_id)` dalam satu transaction. Webhook datang kemudian, match by `order_id` (`Booking.id`); idempotency check prevents duplicate `Payment` inserts.
- **Crash window (b) — antara verified webhook dan state transition**: webhook handler dalam satu transaction. Step: (1) `BEGIN`; (2) `INSERT INTO payment_event_idempotency ... ON CONFLICT DO NOTHING RETURNING id` — jika conflict, return existing event result; (3) `INSERT INTO payment_event ...`; (4) verifikasi amount/currency/order/merchant against `OfferSnapshot` dan `Booking` — jika mismatch, `ROLLBACK` dan log `payment_event_mismatch`; (5) apply state transition (`UPDATE payment SET status = 'paid', settled_at = ...` jika baru; atau no-op jika sudah settled); (6) emit outbox event; (7) `COMMIT`.
- **Crash window (c) — antara transition dan outbox delivery**: transactional outbox pattern. Outbox row inserted dalam transaction yang sama; dispatcher best-effort dengan idempotency (event_id unique). Retry dengan exponential backoff; failure menjadi `outbox_dead_letter` setelah N retry yang akan direview Admin (bukan silent success).
- **Option A vs B vs C untuk `paid_late` package**: lihat §5.2 — A dipilih karena (i) financial truth terjaga, (ii) Admin resolution dapat berupa reschedule/refund/alternative tanpa invent new lifecycle state, (iii) konsistensi dengan `ADR 0059` "no silent refund or silent slot substitution".

### UX (checkout & Admin)

- Browser redirect tidak pernah menampilkan "pembayaran berhasil" yang final sebelum verified webhook. UI menampilkan "Verifying payment..." spinner sampai client polling endpoint mengembalikan status final (`paid`, `paid_late_*`, `failed`). Duplicate webhook tidak menggandakan email konfirmasi.
- Email konfirmasi untuk paid-late package menggunakan copy yang sama dengan paid-on-time package (satu template), tidak ada perbedaan copy yang membingungkan klien.
- Admin workspace untuk paid-late package menampilkan:
  - `PackagePurchase` paid;
  - `SessionEntitlement #1` state `pending_schedule` atau `scheduled` (jika slot asli dapat direacquire);
  - remaining entitlements `state = available` dengan `validity_start = now()` (bukan dari original checkout);
  - opsi Admin: (a) schedule alternative slot for #1, (b) refund full via RefundAction, (c) hold for client decision via WhatsApp.

## Decision

### 1. Invariant: at-most-one successful settlement per Booking/purchase intent

#### 1.1 Pernyataan invariant

> Untuk satu `Booking.id`, terdapat **paling banyak satu** `Payment` dengan `status = 'paid'` (yaitu `settled_at IS NOT NULL`). Untuk satu `PackagePurchase.id`, terdapat paling banyak satu `Payment` dengan `status = 'paid'` (refleksi dari Booking-level uniqueness melalui FK `Booking.id`).

#### 1.2 Mekanisme enforcement

- **Unique partial index** pada tabel `payment`:
  - Postgres: `CREATE UNIQUE INDEX payment_one_settled_per_booking ON payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL;`
  - D1/SQLite: `CREATE UNIQUE INDEX payment_one_settled_per_booking ON payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL;` (SQLite supports partial unique index sejak 3.8.0).
- **Application-level precheck** di webhook handler: `SELECT 1 FROM payment WHERE booking_id = ? AND status = 'paid' LIMIT 1` di dalam transaction sebelum insert. Jika ditemukan, return existing `Payment` (idempotency). Precheck + DB constraint = same pattern sebagai `ADR 0091` capacity overlap.
- **Forbidden state**: dua `Payment` row dengan `booking_id = X` dan `status = 'paid'` keduanya ada. DB constraint menolak insert kedua. Application precheck menolak sebelum insert. Tested dengan integration test acceptance criteria #1.

#### 1.3 Status enum Payment

| Status | Settled_at | Meaning |
|---|---|---|
| `pending` | NULL | `Payment` created saat `createCheckout`, menunggu webhook |
| `paid` | NOT NULL | Verified `capture`/`settlement` event applied |
| `paid_late_slot_reacquired` | NOT NULL | Late verified success; original slot reacquired |
| `paid_late_slot_unavailable` | NOT NULL | Late verified success; slot tidak dapat direacquire; Admin resolution required |
| `paid_late_first_session_pending` | NOT NULL | Package late success; first entitlement held pending Admin scheduling |
| `failed` | NULL | Verified `deny`/`cancel`/`expire`/`failure` event applied |
| `refunded_full` | NOT NULL → di-update via RefundAction summary | `full_refund` RefundAction completed |
| `refunded_no_disbursement` | NOT NULL | `no_refund` RefundAction recorded as audited non-disbursement (Payment tetap paid secara financial, summary menampilkan refunded di Admin UI) |

`Payment.status` adalah **derived current projection**, tidak pernah di-overwrite historical — perubahan dari `paid → refunded_full` adalah update field summary (computed dari `RefundAction` aggregate), bukan rewrite history. `PaymentEvent` append-only; `Payment.settled_at` immutable setelah set.

### 2. Verifikasi amount / currency / order / merchant

#### 2.1 Pernyataan invariant

> Sebuah verified `PaymentEvent` hanya menghasilkan `Payment` settled jika dan hanya jika `event.gross_amount == offer_snapshot.amount_cents AND event.currency == offer_snapshot.currency AND event.order_id == booking.id AND event.merchant_id == configured_merchant_id`.

#### 2.2 Mekanisme enforcement

- Adapter `verifyNotification` mengembalikan `VerifiedPaymentEvent` setelah signature verification + value match check.
- Application handler melakukan **second verification** against `Booking.snapshotted_amount`, `OfferSnapshot.amount_cents`, `OfferSnapshot.currency`, dan `Booking.id`. Ini menjamin defense-in-depth: jika adapter bug atau compromised, value mismatch masih di-catch.
- Mismatch → `INSERT INTO payment_event_mismatch_log (...)` (append-only audit), `INSERT INTO payment_event (event_type='mismatch_log', ...)` (audit trail), `ROLLBACK` transaction, **tidak ada** state transition. Midtrans dashboard dirujuk manual untuk cross-check.
- Currency mismatch (`IDR` vs `USD`/other) → mismatch, karena launch hanya IDR.

#### 2.3 Field verification table

| Field | Source of truth | Verification |
|---|---|---|
| `gross_amount` | `OfferSnapshot.amount_cents` (snapshotted at booking creation per `ADR 0042`) | exact match (cents integer) |
| `currency` | `OfferSnapshot.currency` (default `IDR`) | exact match |
| `order_id` | `Booking.id` (UUID string) | exact match |
| `merchant_id` | Configured Midtrans merchant ID (env var) | exact match |
| `signature_key` | Computed from payload + server key | signature verification (existing) |

### 3. Idempotency key scope

#### 3.1 Lifetime scope

> Idempotency records (`payment_event_idempotency`) keyed by `(provider_event_id, payment_intent_id)` adalah **lifetime**: tidak ada TTL atau purge selama `PaymentEvent` masih ada. Karena `PaymentEvent` append-only dan retained per `TBC-PRIVACY-01` audit/legal policy, idempotency record seumur hidup retensi PaymentEvent.

#### 3.2 Same-key/different-payload behavior

- **Same key + same payload hash** → return existing event result (no-op transition, idempotency hit).
- **Same key + different payload hash** → **typed failure** `idempotency_key_collision`, **ROLLBACK** transaction, log `payment_idempotency_collision` ke `payment_event_mismatch_log`. TIDAK diam-diam overwrite. Midtrans support contacted untuk investigate.
- **Different key + same payload** → diperlakukan sebagai duplicate event terpisah; new `PaymentEvent` row inserted; existing `Payment` unaffected (no-op transition karena sudah settled, atau normal transition jika belum).

#### 3.3 Payload fingerprint

- `payment_event_idempotency.payload_hash = sha256(canonical_json(payload))` — canonical JSON serialization (sorted keys, no whitespace) untuk stabilitas.
- Stored sebagai `bytea` (Postgres) atau `BLOB` (D1/SQLite).

### 4. Out-of-order / repeated-status / reversal mapping

#### 4.1 Status mapping table

| Provider status | `PaymentEvent.event_type` | Effect on `Payment` | Effect on Booking/Appointment/Package |
|---|---|---|---|
| `capture` / `settlement` (final) | `capture` | jika belum settled: `status = 'paid'`, `settled_at = now()` | state transition normal |
| `pending` (transient) | `pending` | no-op | no-op (Booking tetap `pending_payment`) |
| `deny` | `deny` | `status = 'failed'` (jika belum terminal lain) | Booking → `failed` |
| `cancel` | `cancel` | `status = 'failed'` | Booking → `failed` |
| `expire` | `expire` | `status = 'failed'` | Booking → `expired`, SlotHold released |
| `failure` / `failure_late` | `failure` | `status = 'failed'` | Booking → `failed` |
| `refund` (full) | `refund` | no-op di `Payment` (refund adalah RefundAction terpisah) | depends on RefundAction decision |
| `partial_refund` | `partial_refund` | no-op di `Payment` (partial refund deferred; treat as `full_refund` atau `no_refund` action di RefundAction) | depends on Admin decision |
| `chargeback` | `chargeback` | no-op di `Payment` (financial reversal handled outside booking product) | Admin alerted via reconciliation report |
| `challenge` / `fraud` | `challenge` | no state change | Admin review; Booking tetap `pending_payment` |
| `recurring` / `subscription` | n/a | not applicable — launch tidak ada subscription | n/a |

#### 4.2 Repeated `capture` / `settlement`

- Duplicate `capture` untuk `Booking` yang sudah settled → idempotency hit, return existing Payment status. Tidak insert `Payment` kedua. Email konfirmasi tambahan tidak dikirim (idempotency tracked via `notification_log`).
- Reverse order: `cancel` setelah `capture` → `cancel` di-apply jika `Payment.status` belum `paid` (artinya admin/expire membatalkan mid-flight); jika sudah `paid`, `cancel` di-ignore dan Admin alerted (karena settlement sudah final di Midtrans).

#### 4.3 Reversal mapping

- `refund` event dari Midtrans **tidak** menggerakkan `Payment` state. Refund adalah `RefundAction` terpisah yang di-trigger oleh Admin (`ADR 0077` full/no-refund only). Webhook `refund` event hanya di-log untuk reconciliation.
- `chargeback` event di-log ke `payment_chargeback_log` (append-only); Admin alerted; tidak mengubah `Payment` status otomatis.

### 5. `paid_late` package creation

#### 5.1 Option analysis

| Option | Deskripsi | Pro | Kontra |
|---|---|---|---|
| **A** | `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` dibuat **saat webhook verified**; jika slot reacquire gagal, first `SessionEntitlement.state = 'pending_schedule'` | Financial truth terjaga; Admin resolution tanpa invent new state; konsistensi dengan `ADR 0059` | Butuh `pending_schedule` state untuk first entitlement |
| **B** | Tunda sampai Admin resolution | Tidak ada state ambigu | Kehilangan financial truth (Payment paid tapi PackagePurchase belum ada → reporting jadi susah); Admin jadi bottleneck untuk hal yang seharusnya otomatis |
| **C** | Buat dengan first session held sebagai `pending_schedule` (variant A) | Sama dengan A | Tidak ada perbedaan dengan A kecuali kalau diinterpretasikan sebagai "Admin must resolve before any entitlement visible" — tapi itu mereintroduce B |

**Decision: Option A** (eagle eye: identik dengan C, tapi C saya perjelas sebagai "Admin resolves ke real slot", sedangkan A adalah "first session held dengan pending_schedule atau scheduled jika reacquire berhasil, Admin resolves via existing reconciliation flow tanpa gate"). Rationale: financial truth, tidak ada new lifecycle state invented, Admin resolution flow sudah ada dari `ADR 0059` line 18.

#### 5.2 `paid_late` package atomic creation

Pada saat verified webhook untuk **late** payment (hold sudah expired):

1. `Payment.status = 'paid_late_first_session_pending'` (atau `'paid_late_slot_reacquired'` jika reacquire berhasil — lihat §5.3).
2. `PackagePurchase` dibuat dengan `status = 'paid'` (atau `'paid_late'` — konsisten dengan Payment status enum).
3. `PackageValidity` dibuat dengan `validity_start = now()` (bukan original checkout time karena hold sudah expired — slot pertama tidak valid dari waktu itu).
4. Ordered `SessionEntitlement` rows:
   - `SessionEntitlement #1`: `state = 'pending_schedule'` (jika reacquire gagal) atau `'scheduled'` + linked ke Appointment reacquired (jika reacquire berhasil).
   - `SessionEntitlement #2..N`: `state = 'available'`.
5. Transactional effects: Booking original di-mark `paid_late_reconciled` (status terminal — bukan `confirmed` karena original slot tidak confirmed; bukan `failed` karena payment sukses). Booking adalah paid late, package adalah paid late, original slot released (jika reacquire gagal) atau tetap held (jika reacquire berhasil).

#### 5.3 Slot reacquire attempt

Mengikuti `ADR 0059` line 17, `ADR 0091` capacity overlap detection:

1. Di dalam transaction, query `CapacityReservation` existing untuk `(psychologist_id, original_starts_at, original_ends_at, state IN {hold_active, confirmed})` dengan `effective_range overlap` check.
2. Jika tidak ada overlap dan original `AvailabilitySlot` masih `state = 'available'`:
   - `INSERT INTO capacity_reservation (reservation_kind = 'confirmed', state = 'confirmed', ...)` — atomic claim.
   - `INSERT INTO appointment (state = 'confirmed', ...)` — linked ke original slot.
   - `SessionEntitlement #1.state = 'scheduled'`, linked ke Appointment ini.
   - `Payment.status = 'paid_late_slot_reacquired'`.
   - `Booking.status = 'paid_late_slot_reacquired'`.
3. Jika ada overlap atau slot unavailable:
   - Tidak insert `CapacityReservation`.
   - Tidak insert `Appointment`.
   - `SessionEntitlement #1.state = 'pending_schedule'`.
   - `Payment.status = 'paid_late_first_session_pending'`.
   - `Booking.status = 'paid_late_slot_unavailable'`.
   - Original `Booking.snapshotted_slot_id` reference di-keep untuk audit (Admin perlu tahu slot mana yang awalnya dimaksud).

#### 5.4 Admin resolution flow untuk `paid_late_first_session_pending`

Admin workspace melihat `PackagePurchase` dengan flag `requires_first_session_scheduling = true`. Resolution options (existing Admin WhatsApp flow per `ADR 0067`):

- **Option X**: Schedule alternative slot for `SessionEntitlement #1` → `ScheduleNextEntitlement` dengan slot baru (psikolog + klien agreed); `state` berubah dari `pending_schedule` ke `scheduled`.
- **Option Y**: Full refund via `RefundAction.status = 'full_refund'` → `PackagePurchase.status = 'closed_refunded'`, semua remaining entitlements `state = 'cancelled'` (tidak consumed karena tidak dipakai), `Payment.status = 'refunded_full'`.
- **Option Z**: Hold for client decision → `PackagePurchase.requires_first_session_scheduling` tetap true; Admin follow-up via WhatsApp. Tidak ada timeline otomatis; Admin decides based on client response.

Admin tidak boleh otomatis melakukan refund tanpa eksplisit client/Admin decision (consistent dengan `ADR 0076` no auto-cutoff).

### 6. SQL migration (Postgres family)

```sql
-- Migration 0093: payment settlement uniqueness and paid_late package effects

-- 6.1 Unique partial index: at-most-one successful settlement per Booking
CREATE UNIQUE INDEX IF NOT EXISTS payment_one_settled_per_booking
  ON payment(booking_id)
  WHERE status = 'paid' AND settled_at IS NOT NULL;

-- 6.2 Idempotency record (lifetime, keyed by provider event id)
CREATE TABLE IF NOT EXISTS payment_event_idempotency (
  payment_intent_id     uuid NOT NULL,
  provider_event_id     text NOT NULL,
  payload_hash          bytea NOT NULL,
  payment_event_id      uuid NOT NULL REFERENCES payment_event(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_event_id, payment_intent_id)
);

-- 6.3 Payment status enum extension (additive, idempotent)
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid_late_slot_reacquired';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid_late_slot_unavailable';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid_late_first_session_pending';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded_no_disbursement';

-- 6.4 SessionEntitlement state enum extension (additive)
ALTER TYPE session_entitlement_state ADD VALUE IF NOT EXISTS 'pending_schedule';

-- 6.5 PackagePurchase: requires_first_session_scheduling flag
ALTER TABLE package_purchase
  ADD COLUMN IF NOT EXISTS requires_first_session_scheduling boolean NOT NULL DEFAULT false;

-- 6.6 Payment mismatch log (append-only audit)
CREATE TABLE IF NOT EXISTS payment_event_mismatch_log (
  id                   uuid PRIMARY KEY,
  booking_id           uuid NOT NULL,
  payment_intent_id    uuid,
  provider_event_id    text,
  mismatch_kind        enum NOT NULL,         -- 'amount' | 'currency' | 'order_id' | 'merchant_id' | 'idempotency_collision' | 'other'
  expected_value       jsonb,
  actual_value         jsonb,
  payload_hash         bytea,
  detected_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz,
  resolved_by          uuid,                  -- staff_id
  resolution_action    text
);

CREATE INDEX IF NOT EXISTS payment_mismatch_unresolved
  ON payment_event_mismatch_log(booking_id)
  WHERE resolved_at IS NULL;

-- 6.7 Outbox table (transactional outbox for state transition events)
CREATE TABLE IF NOT EXISTS application_outbox (
  id                   uuid PRIMARY KEY,
  aggregate_type       text NOT NULL,         -- 'payment' | 'booking' | 'package_purchase' | etc
  aggregate_id         uuid NOT NULL,
  event_type           text NOT NULL,
  payload              jsonb NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  dispatched_at        timestamptz,
  dispatch_attempts    int NOT NULL DEFAULT 0,
  last_error           text
);

CREATE INDEX IF NOT EXISTS outbox_pending
  ON application_outbox(created_at)
  WHERE dispatched_at IS NULL;

-- 6.8 Booking status enum extension (additive)
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_late_slot_reacquired';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_late_slot_unavailable';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_late_reconciled';

-- 6.9 PackagePurchase status enum extension (additive)
ALTER TYPE package_purchase_status ADD VALUE IF NOT EXISTS 'paid_late';
ALTER TYPE package_purchase_status ADD VALUE IF NOT EXISTS 'closed_refunded';
```

Rollback (Postgres): drop indexes, drop tables (idempotency, mismatch log, outbox), drop columns, drop enum values (tidak reversible di Postgres; alternative: leave enum values unused, document sebagai deprecated).

### 7. D1 / SQLite equivalent

D1 (SQLite) tidak mendukung `ALTER TYPE ... ADD VALUE`. Solusi: enum values didefinisikan sebagai application-level CHECK constraint atau TEXT dengan application-level validation. `ADD COLUMN IF NOT EXISTS` supported sejak SQLite 3.35.0. Partial unique index supported sejak 3.8.0.

```sql
-- 7.1 Unique partial index (sama syntax, supported)
CREATE UNIQUE INDEX IF NOT EXISTS payment_one_settled_per_booking
  ON payment(booking_id)
  WHERE status = 'paid' AND settled_at IS NOT NULL;

-- 7.2 Idempotency record (sama DDL)
CREATE TABLE IF NOT EXISTS payment_event_idempotency (
  payment_intent_id     text NOT NULL,
  provider_event_id     text NOT NULL,
  payload_hash          blob NOT NULL,
  payment_event_id      text NOT NULL REFERENCES payment_event(id),
  created_at            text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (provider_event_id, payment_intent_id)
);

-- 7.3 SessionEntitlement state CHECK constraint (SQLite tidak punya enum ALTER)
-- Pre-existing CHECK constraint di session_entitlement harus sudah include 'pending_schedule'.
-- Jika belum, ALTER TABLE recreate:
-- ALTER TABLE session_entitlement RENAME TO session_entitlement_old;
-- CREATE TABLE session_entitlement (... new CHECK ...);
-- INSERT INTO session_entitlement SELECT * FROM session_entitlement_old;
-- DROP TABLE session_entitlement_old;

-- 7.4 PackagePurchase column
ALTER TABLE package_purchase
  ADD COLUMN requires_first_session_scheduling integer NOT NULL DEFAULT 0;
-- (0 = false, 1 = true; SQLite tidak punya boolean native)

-- 7.5 Mismatch log (sama DDL dengan text/timestamp adjustments)
CREATE TABLE IF NOT EXISTS payment_event_mismatch_log (
  id                   text PRIMARY KEY,
  booking_id           text NOT NULL,
  payment_intent_id    text,
  provider_event_id    text,
  mismatch_kind        text NOT NULL CHECK (mismatch_kind IN
                       ('amount','currency','order_id','merchant_id','idempotency_collision','other')),
  expected_value       text,  -- JSON serialized
  actual_value         text,
  payload_hash         blob,
  detected_at          text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolved_at          text,
  resolved_by          text,
  resolution_action    text
);

CREATE INDEX IF NOT EXISTS payment_mismatch_unresolved
  ON payment_event_mismatch_log(booking_id)
  WHERE resolved_at IS NULL;

-- 7.6 Outbox (sama DDL)
CREATE TABLE IF NOT EXISTS application_outbox (
  id                   text PRIMARY KEY,
  aggregate_type       text NOT NULL,
  aggregate_id         text NOT NULL,
  event_type           text NOT NULL,
  payload              text NOT NULL,
  created_at           text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  dispatched_at        text,
  dispatch_attempts    integer NOT NULL DEFAULT 0,
  last_error           text
);

CREATE INDEX IF NOT EXISTS outbox_pending
  ON application_outbox(created_at)
  WHERE dispatched_at IS NULL;
```

### 8. Konsekuensi

**Positif**:

- Financial truth terjaga — at-most-one `Payment` settled per Booking, dengan amount/currency/order/merchant match.
- Duplicate webhook aman — idempotency hit returns existing result, no-op transition.
- Late payment untuk package tidak kehilangan PackagePurchase — `paid_late` path membuat PackagePurchase dengan first entitlement `pending_schedule`, Admin dapat resolve.
- Crash window eksplisit ditangani di tiga boundaries, dengan transactional outbox untuk delivery guarantee.
- Konsisten dengan `ADR 0059` (late payment reconciliation), `ADR 0091` (capacity overlap), `ADR 0023`-style idempotency primitives.

**Biaya dan constraint**:

- Tiga window berbeda menambah kompleksitas operational (Admin perlu membaca runbook).
- Unique partial index harus di-maintain di migration (rollback strategy: drop index, bukan drop data).
- Outbox dispatcher butuh monitoring; `outbox_pending` index membantu query untuk dead-letter detection.
- `paid_late_first_session_pending` adalah new state yang Admin perlu pahami di workspace (admin UX impact).
- `payment_event_mismatch_log` dan reconciliation entries butuh Admin review cadence.

**Forbidden**:

- Multiple `Payment` rows settled per `Booking.id`.
- Verifikasi signature saja tanpa amount/currency/order/merchant match.
- Idempotency record dengan TTL.
- Silent refund atau silent slot substitution setelah late payment.
- Outbox dispatcher yang menulis langsung ke external system tanpa idempotency.
- Payment status rewrite in-place untuk merepresentasikan perubahan historis (mengikuti `IMPLEMENTATION-GUIDE.md §8.1` append-only rule).

## Open follow-up

- **Outbox dispatcher implementation**: harus didefinisikan sebagai background worker dengan retry policy (exponential backoff, max attempts, dead-letter routing). Belum ada implementation ADR; in-scope untuk Slice 7 atau Slice 8 (notifications).
- **Reconciliation cadence**: kapan Admin review `payment_event_mismatch_log` (unresolved entries)? Real-time alert via notification, atau daily digest? Tergantung operational policy.
- **`requires_first_session_scheduling` UX di Admin workspace**: layout dan CTA. Belum ada wireframe; in-scope untuk Slice 6 cancellation/refund atau Slice 5 staff/ClientAccess.
- **`paid_late_first_session_pending` automatic expiry**: jika Admin tidak resolve dalam N hari, apakah PackagePurchase auto-close atau tetap hold? Konsisten dengan `ADR 0076` no auto-cutoff — rekomendasi: tidak ada auto-expiry; Admin decides.
- **Chargeback handling**: event `chargeback` di-log tapi tidak menggerakkan state; apakah perlu automatic RefundAction atau Admin-decide? Konsisten dengan `ADR 0077` full/no-refund Admin-decide — rekomendasi: Admin-decide.
- **Cross-aggregate transaction strategy**: `Booking`/`Payment`/`PackagePurchase`/`SessionEntitlement` adalah aggregate berbeda; ADR ini mengasumsikan satu application transaction menyentuh semuanya (Postgres allows; D1 serial per DB). Pada Postgres production dengan cross-aggregate writes, pertimbangkan transactional outbox + saga atau 2PC. Belum ada ADR.

## Reference

- `ADR 0023` (idempotency primitives) — referenced untuk pattern, content tidak tersedia saat penulisan ADR ini
- `ADR 0059-late-payment-reconciliation.md` — late payment untuk single-session Booking
- `ADR 0076-case-by-case-cancellation.md` — no auto-cutoff
- `ADR 0077-launch-full-or-no-refund.md` — refund vocabulary
- `ADR 0042-offer-snapshot-immutable.md` — OfferSnapshot sebagai source of truth untuk amount/currency
- `ADR 0090-couple-participant-model.md` — couple package participant (untuk paid-late couple handling)
- `ADR 0091-capacity-overlap-buffer.md` — capacity reservation overlap detection
- `IMPLEMENTATION-GUIDE.md §7 Payment implementation` — patched alongside this ADR
- `IMPLEMENTATION-GUIDE.md §8 Persistence and data rules` — append-only, concurrency, idempotency key
- `DOMAIN-MODEL.md` Payment and refund section — patched alongside this ADR
- `PRD-GUIDELINE-REVIEW.md` Round 1 P1-10 + Round 2 follow-up — TBC-PAY-SETTLEMENT-01 closed by this ADR
- `CONTEXT.md:41` — multiple payment attempts context
- Ticket #5 — Settlement uniqueness & paid-late package (closes this ticket)
