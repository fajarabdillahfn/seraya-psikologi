# 91. Capacity Overlap and TransitionBuffer Placement

## Status

Accepted for MVP. Closes `TBC-CAPACITY-01` and `TBC-BUFFER-01` from `PRD-GUIDELINE-REVIEW.md` (Round 1 P1-02). Implements the overlap detection mechanism and buffer placement left open by `ADR 0013-offering-specific-slots.md` and `ADR 0041-transition-buffer.md`. Production launch still requires `TBC-STACK-01` (Worker + D1 vs Supabase + Postgres) to be closed before any migration is executed; this ADR is schema-shape-stable across both stacks but the exact DDL syntax in §6 is written for the Postgres family. D1/SQLite equivalent is documented in §7.

## Ringkasan eksekutif (Bahasa Indonesia)

- **Granularitas candidate slot tetap 30 menit**, dengan sesi 60 menit occupying 2 slot berurutan dan TransitionBuffer 15 menit occupying 0 atau 1 slot tambahan di tiap sisi. 30 dipilih di atas 15 dan 60 karena: (a) 15-menit grid dengan sesi 60 menit + buffer 15 menit menghasilkan 6 slot kandidat untuk satu sesi, dengan kombinasi overlap yang sangat banyak; (b) 60-menit grid hanya memungkinkan sesi back-to-back tanpa ruang untuk buffer atau persiapan psikolog; (c) 30-menit grid menghasilkan 3 slot untuk satu sesi (60 + 2×15) yang manageable dan membiarkan slot adjacent legitimate untuk offering berbeda yang tidak overlap setelah buffer.
- **Unit atomik kapasitas adalah `CapacityReservation`**, bukan `AvailabilitySlot`. Sebuah `CapacityReservation` dibuat saat `SlotHold` aktif atau `Appointment` confirmed, dan membawa interval `[starts_at, ends_at)` yang sudah termasuk buffer di kedua sisi. Invariant: untuk satu psikolog, dua reservation dengan `state ∈ {hold_active, confirmed}` **tidak boleh overlap** ketika interval `starts_at..(ends_at + 2×transition_buffer_minutes)` mereka overlap.
- **TransitionBuffer placement: simetris mengelilingi appointment** (`[start − buffer, end + buffer)`). Bukan before-only (yang membiarkan sesi back-to-back tanpa persiapan) atau after-only (yang membiarkan psikolog mulai sesi berikutnya tanpa transisi). Definisi operasionalnya: reservation interval yang disimpan adalah `[starts_at, ends_at)` sesi ditambah buffer di kedua sisi untuk deteksi overlap; slot display tetap menampilkan jam sesi saja.
- **Concurrency enforcement: app-level precheck + database constraint**. App-level precheck (`SELECT ... FOR UPDATE` di Postgres; transactional read di D1) memberikan error yang ramah; database constraint `EXCLUDE USING GIST` (atau `UNIQUE` indexed range di D1) menjadi hard guarantee.
- **Tidak ada lagi TBC untuk capacity overlap atau buffer placement** di Slice 1 availability atau Slice 2 hold. Yang masih TBC adalah arsitektur stack (P0-01), intake/minor/eligibility (P0-04), couple participant (P0-03), dan payment expiry/TTL (P1-03) — di luar cakupan ADR ini.

## Context

`ADR 0013` sudah memutuskan bahwa `AvailabilitySlot` milik satu psikolog dan satu `ServiceOffering`, dan bahwa active `SlotHold` serta confirmed `Appointment` untuk psikolog yang sama tidak boleh overlap tanpa membedakan offering. `ADR 0041` sudah memutuskan TransitionBuffer 15 menit dengan admin-configurable per offering, di-snapshot pada transaction, dan diterapkan pada generation, SlotHold, Appointment overlap check, dan reschedule slot claim.

Ticket #3 (`vault/Projects/Seraya Psikologi/Tickets/Ticket 03 — Capacity overlap & TransitionBuffer.md`) mengangkat dua keputusan yang masih terbuka:

1. **Granularitas slot kandidat.** 15 menit menghasilkan kandidat banyak (6 slot untuk satu sesi 60-menit dengan buffer 15-menit) dan memungkinkan kombinasi overlap antar offering yang sulit dibatasi. 60 menit tidak menyisakan ruang untuk buffer. 30 menit menjadi grid terkecil yang (a) membagi sesi 60-menit menjadi tepat 2 unit, (b) membiarkan TransitionBuffer 15-menit menjadi 0 atau 1 slot tambahan, dan (c) membolehkan psikolog yang sama memegang dua sesi adjacent di offering berbeda tanpa semu kecuali buffer overlap.

2. **Mekanisme deteksi overlap.** Guide saat ini hanya meminta `unique active hold per slot` (`IMPLEMENTATION-GUIDE.md §8.2`). Unique-per-slot tidak cukup karena: (a) satu psikolog dapat memiliki dua `AvailabilitySlot` untuk offering berbeda dengan `[starts_at, ends_at)` yang sama; (b) `EXISTS`-style race pada saat `CreateSlotHold` dapat memasukkan dua hold sebelum unique constraint sempat di-check.

3. **Placement TransitionBuffer.** `ADR 0041` line 33–35 masih membuka before/after/both. Tiga kandidat:
   - **before-only**: sesi 10:00–11:00 + buffer 09:45–10:00. Sesi berikutnya 11:00–12:00 masih boleh di-claim oleh psikolog lain jika psikolog ini tidak klaim, tetapi tidak ada waktu untuk psikolog melakukan transisi ke 11:00. Tidak aman untuk psikolog.
   - **after-only**: sesi 10:00–11:00 + buffer 11:00–11:15. Psikolog tidak punya waktu untuk prep sebelum 10:00. Tidak aman untuk psikolog.
   - **both / simetris mengelilingi appointment**: interval efektif `[start − buffer, end + buffer)`. Reservation disimpan dengan `starts_at = session_start − buffer` dan `ends_at = session_end + buffer` atau dengan `ends_at = session_end + 2×buffer` dan deteksi overlap dilakukan pada `starts_at − buffer .. ends_at` — kedua formulation equivalent untuk overlap detection. Placement simetris menjamin psikolog mendapat transisi sebelum dan sesudah, dan mencegah sesi back-to-back untuk psikolog yang sama.

   Round 3 `PRD-GUIDELINE-REVIEW.md` (Non-Teknis menang pada konflik bisnis) tidak menyentuh placement ini, sehingga keputusan ada di tangan tim teknis berdasarkan implikasi operasional untuk psikolog.

## Diskusi multi-perspektif

### Privacy (klinis/etis)

- Overlap detection pada level psikolog + waktu (bukan per offering) menjamin tidak ada cross-offering double booking yang dapat membocorkan availability satu klien ke klien lain melalui availability inference. Sesi A untuk klien X (offering individual) dan sesi B untuk klien Y (offering couple) untuk psikolog yang sama pada jam yang sama akan terdeteksi sebagai overlap dan di-reject, meskipun offering berbeda.
- TransitionBuffer tidak berisi data klinis. Snapshotting `transition_buffer_minutes` pada `OfferSnapshot` dan `CapacityReservation` adalah operational metadata; tidak ada perubahan sign-off konsent atau wording konsent.
- Couple package (3 appointment A/B/joint) menggunakan model `BookingParticipant`/`AppointmentParticipant` dari `ADR 0090`. Overlap detection untuk couple mengikuti model yang sama: dua `Appointment` untuk psikolog yang sama tidak boleh overlap setelah buffer.

### Operations (admin/finance)

- Admin workspace perlu menampilkan effective buffer per offering (diwariskan dari `Service` atau override pada `ServiceOffering` per `ADR 0043`) dan effective reservation interval di Admin UI. Tidak ada perubahan alur cancellation/refund.
- Slot generation (90-day rolling, `ADR 0040`) menghasilkan `AvailabilitySlot` pada grid 30-menit; `CapacityReservation` dibuat on-demand saat `SlotHold` aktif atau `Appointment` confirmed, bukan saat slot generation. Ini memisahkan "candidate capacity" (AvailabilitySlot) dari "claimed capacity" (CapacityReservation).
- Late-payment reacquisition (`ADR 0059`) tetap menggunakan atomic claim — membuat `CapacityReservation` baru dan reject jika overlap. Tidak ada perubahan pada path reconciliation.
- Couple package launch-deferred sampai `TBC-COUPLE-LAUNCH-01` ditutup, tetapi model capacity overlap yang diputuskan di ADR ini sudah kompatibel dengan `ADR 0090`.

### Engineering (aggregate & schema)

#### Mengapa `CapacityReservation` bukan langsung di `AvailabilitySlot`?

`AvailabilitySlot` adalah representasi kandidat bookable capacity. Ia harus tetap bisa di-generate/di-withdraw secara massal saat `AvailabilityRule/Exception` berubah (`ADR 0061`). Jika uniqueness overlap ditempatkan langsung di `AvailabilitySlot`, maka:

- Regeneration harus membuat/mutate banyak row untuk satu perubahan aturan;
- Status hold/confirmed harus di-track sebagai kolom `state` di `AvailabilitySlot` yang bercampur dengan metadata slot;
- Couple participant (`ADR 0090`) yang membutuhkan dua `Appointment` dari satu `Booking` akan sulit dimodelkan tanpa reservation terpisah per appointment.

`CapacityReservation` adalah agregat yang merepresentasikan "slot waktu yang sedang di-claim" untuk psikolog tertentu. Ia child-of `Booking` (untuk `SlotHold`-backed) atau child-of `Appointment` (untuk confirmed). Granularitas:

- `CapacityReservation` untuk SlotHold: 1 row per `Booking` selama hold aktif. State `hold_active`. Ends_at = booking hold expiry + 2×buffer; reservation auto-released saat hold expiry.
- `CapacityReservation` untuk confirmed Appointment: 1 row per `Appointment`. State `confirmed`. Ends_at = appointment_end + 2×buffer.

Kedua tipe reservation ini share satu unique/overlap constraint pada `(psychologist_id, time_range, state)`.

#### Mengapa placement simetris, bukan before-only atau after-only?

Before-only membuat sesi back-to-back tanpa transisi (misal 10:00–11:00 dan 11:00–12:00 untuk psikolog yang sama) tanpa waktu untuk psikolog melakukan catatan pasca-sesi dan prep untuk sesi berikutnya. After-only membuat psikolog tidak punya waktu untuk prep sebelum sesi. Simetris mengelilingi appointment memastikan psikolog mendapat transisi sebelum dan sesudah, dan dua sesi adjacent tanpa gap akan terdeteksi sebagai overlap.

Untuk menawarkan konsistensi display: UI menampilkan jam `[starts_at + buffer, ends_at − buffer)` (jam sesi saja). Reservation internal mencakup buffer.

#### Mengapa 30 menit, bukan 15 atau 60?

- **15 menit**: grid 15-menit × sesi 60-menit = 4 slot dasar. Dengan TransitionBuffer 15-menit di kedua sisi, satu sesi membutuhkan 6 slot (08:00 sesi → reservation 08:45–10:15 jika grid 15-menit starting 00:00). Granularitas ini menghasilkan banyak kandidat yang harus di-filter saat generation, dan banyak kombinasi overlap yang harus di-check saat hold.
- **30 menit**: grid 30-menit × sesi 60-menit = 2 slot dasar. Dengan TransitionBuffer 15-menit di kedua sisi, satu sesi membutuhkan 3 slot (08:00 sesi → reservation 08:45–10:15 mencakup slot 08:30–09:00, 09:00–09:30, 09:30–10:00). Manageable.
- **60 menit**: grid 60-menit tidak menyisakan ruang untuk buffer atau sesi adjacent. Tidak implementable untuk 15-menit buffer.

30 menit adalah pilihan yang balance antara granularity operasional (psikolog tidak di-block dari slot adjacent legitimate) dan kemampuan teknis (constraint check pada 3-slot block per sesi).

#### Mengapa app-level + DB constraint, bukan salah satu saja?

- **DB constraint only**: error dari DB constraint tidak ramah untuk UI; transaction sudah terjadi dan rollback overhead tidak perlu; tidak ada actionable message untuk klien.
- **App-level only**: race condition antara dua `CreateSlotHold` concurrent untuk slot overlap dapat lolos karena TOCTOU. Pada Postgres, `SELECT ... FOR UPDATE` di dalam transaction memberikan serialization point; pada D1 (SQLite), transaksi serial per database membuat race tetap mungkin tanpa explicit constraint.
- **Both**: app-level precheck dengan `SELECT ... FOR UPDATE` (Postgres) atau transactional read (D1) menolak hold kedua sebelum DB write; DB constraint sebagai hard guarantee untuk race yang lolos dari app-level (misal cross-process, cross-worker). Best practice untuk capacity-critical systems.

## Decision

### 1. Granularitas candidate slot: **30 menit**

- `AvailabilitySlot` di-generate pada grid 30-menit, anchored ke jam `:00` atau `:30` di timezone `Asia/Jakarta`.
- Sesi 60-menit occupying 2 slot berurutan. TransitionBuffer 15-menit occupying 0 atau 1 slot tambahan di tiap sisi, tergantung alignment grid.
- `starts_at` slot adalah inclusive (mis. `08:00:00`, `08:30:00`). `ends_at` adalah exclusive.
- Slot yang tidak valid (mis. psikolog tidak available pada Sabtu) tetap di-generate tetapi di-mark `withdrawn`/`unavailable` per `ADR 0061`.

### 2. Capacity uniqueness model: **`CapacityReservation` table** dengan canonical overlap detection

Model final:

```
CapacityReservation(
  id                     uuid PRIMARY KEY,
  psychologist_id        uuid NOT NULL,
  booking_id             uuid,                 -- NULL jika bukan dari Booking
  appointment_id         uuid,                 -- NULL jika bukan confirmed Appointment
  reservation_kind       enum NOT NULL,        -- 'hold' | 'confirmed'
  state                  enum NOT NULL,        -- 'hold_active' | 'confirmed' | 'released' | 'cancelled' | 'expired'
  starts_at              timestamptz NOT NULL, -- = session_start_at (UI-displayed)
  ends_at                timestamptz NOT NULL, -- = session_end_at (UI-displayed)
  buffer_minutes         int  NOT NULL,        -- snapshot from ServiceOffering
  created_at             timestamptz NOT NULL,
  released_at            timestamptz,
  release_reason         enum,                 -- 'hold_expired' | 'booking_cancelled' | 'appointment_cancelled' | 'admin_override'
  version                int  NOT NULL DEFAULT 1
)
```

Canonical overlap detection: untuk satu `psychologist_id`, dua `CapacityReservation` dengan `state ∈ {hold_active, confirmed}` overlap jika interval `starts_at .. ends_at + (2 × buffer_minutes)` mereka overlap (Postgres: `tstzrange(starts_at, ends_at + (buffer_minutes || ' minutes')::interval, '[)')`; D1/SQLite: explicit `WHERE` clause atau trigger-based check).

Decision: gunakan **app-level precheck + DB constraint**, dengan DB constraint sebagai hard guarantee. Pada Postgres, ini adalah `EXCLUDE USING GIST`; pada D1/SQLite, ini adalah trigger `BEFORE INSERT/UPDATE` yang menolak overlap.

### 3. TransitionBuffer placement: **simetris mengelilingi appointment**

- Reservation interval efektif untuk overlap detection: `[starts_at, ends_at + (2 × buffer_minutes))`.
- UI menampilkan `[starts_at, ends_at)` saja (jam sesi).
- Definisi operasional: "tidak ada dua reservation untuk psikolog yang sama yang claim waktu preparation/transition/transit yang sama."
- Per-offering buffer di-snapshot pada `CapacityReservation.buffer_minutes` mengikuti `OfferSnapshot` per `ADR 0042`.

### 4. Concurrency enforcement: **app-level + DB constraint**

- **App-level precheck** di dalam transaction: query existing `CapacityReservation` untuk `psychologist_id` dengan `state ∈ {hold_active, confirmed}` yang overlap dengan interval efektif baru. Jika ditemukan, return typed failure `capacity_overlap`.
- **DB constraint**:
  - Postgres: `EXCLUDE USING GIST (psychologist_id WITH =, tstzrange(starts_at, ends_at + (buffer_minutes || ' minutes')::interval * 2, '[)') WITH &&) WHERE (state IN ('hold_active', 'confirmed'))`.
  - D1/SQLite: `CREATE TRIGGER capacity_reservation_no_overlap BEFORE INSERT ON capacity_reservation ...` yang melakukan explicit overlap check pada row existing.

### 5. Definisi "no overlap" di level psikolog + waktu

Invariant: untuk satu `psychologist_id`, tidak ada dua `CapacityReservation` dengan `state ∈ {hold_active, confirmed}` yang memiliki `effective_range = [starts_at, ends_at + 2 × buffer_minutes)` overlap. `effective_range` overlap terdeteksi via `range_overlap(a, b) = a.lower < b.upper AND b.lower < a.upper`.

Definisi ini berlaku untuk semua kombinasi:

- `hold_active` vs `hold_active`: di-reject jika overlap. Atomic claim.
- `hold_active` vs `confirmed`: di-reject jika overlap. Hold kedua gagal.
- `confirmed` vs `confirmed`: di-reject jika overlap. Appointment kedua gagal.
- `confirmed` vs `released/expired/cancelled`: allowed (history tidak memblokir).
- Reservation dengan `psychologist_id` berbeda: allowed (psikolog berbeda tidak conflict).

### 6. Migration schema (Postgres family — D1/SQLite equivalent di §7)

```sql
-- 0091_capacity_reservation.sql

CREATE TYPE capacity_reservation_kind AS ENUM ('hold', 'confirmed');
CREATE TYPE capacity_reservation_state AS ENUM (
  'hold_active', 'confirmed', 'released', 'cancelled', 'expired'
);
CREATE TYPE capacity_reservation_release_reason AS ENUM (
  'hold_expired', 'booking_cancelled', 'appointment_cancelled', 'admin_override'
);

CREATE TABLE capacity_reservation (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  psychologist_id     uuid NOT NULL REFERENCES psychologist_profile(id),
  booking_id          uuid REFERENCES booking(id),
  appointment_id      uuid REFERENCES appointment(id),
  reservation_kind    capacity_reservation_kind NOT NULL,
  state               capacity_reservation_state NOT NULL,
  starts_at           timestamptz NOT NULL,
  ends_at             timestamptz NOT NULL,
  buffer_minutes      int NOT NULL CHECK (buffer_minutes >= 0),
  created_at          timestamptz NOT NULL DEFAULT now(),
  released_at         timestamptz,
  release_reason      capacity_reservation_release_reason,
  version             int NOT NULL DEFAULT 1,
  CONSTRAINT capacity_reservation_time_order CHECK (ends_at > starts_at),
  CONSTRAINT capacity_reservation_booking_or_appointment
    CHECK (
      (reservation_kind = 'hold'      AND booking_id IS NOT NULL AND appointment_id IS NULL) OR
      (reservation_kind = 'confirmed' AND appointment_id IS NOT NULL)
    )
);

CREATE INDEX capacity_reservation_psychologist_state_idx
  ON capacity_reservation (psychologist_id, state);

-- Hard guarantee: no two active/confirmed reservations overlap per psychologist.
-- effective_range = [starts_at, ends_at + 2*buffer). Implemented via tstzrange exclusion.
ALTER TABLE capacity_reservation
  ADD CONSTRAINT capacity_reservation_no_overlap
  EXCLUDE USING GIST (
    psychologist_id WITH =,
    tstzrange(
      starts_at,
      ends_at + make_interval(mins => buffer_minutes * 2),
      '[)'
    ) WITH &&
  )
  WHERE (state IN ('hold_active', 'confirmed'));

-- Append-only history: state transitions are UPDATE only, never DELETE.
-- Audit trail is maintained via AuditRecord per IMPLEMENTATION-GUIDE.md §11.
```

D1/SQLite equivalent §7 menggunakan trigger untuk replicate `EXCLUDE` constraint.

### 7. D1/SQLite equivalent

```sql
-- 0091_capacity_reservation.sql (D1/SQLite)

CREATE TABLE capacity_reservation (
  id                  TEXT PRIMARY KEY,
  psychologist_id     TEXT NOT NULL REFERENCES psychologist_profile(id),
  booking_id          TEXT REFERENCES booking(id),
  appointment_id      TEXT REFERENCES appointment(id),
  reservation_kind    TEXT NOT NULL CHECK (reservation_kind IN ('hold', 'confirmed')),
  state               TEXT NOT NULL CHECK (state IN ('hold_active', 'confirmed', 'released', 'cancelled', 'expired')),
  starts_at           TEXT NOT NULL,  -- ISO 8601 timestamptz
  ends_at             TEXT NOT NULL,
  buffer_minutes      INTEGER NOT NULL CHECK (buffer_minutes >= 0),
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  released_at         TEXT,
  release_reason      TEXT CHECK (release_reason IN ('hold_expired', 'booking_cancelled', 'appointment_cancelled', 'admin_override') OR release_reason IS NULL),
  version             INTEGER NOT NULL DEFAULT 1,
  CHECK (ends_at > starts_at),
  CHECK (
    (reservation_kind = 'hold'      AND booking_id IS NOT NULL AND appointment_id IS NULL) OR
    (reservation_kind = 'confirmed' AND appointment_id IS NOT NULL)
  )
);

CREATE INDEX capacity_reservation_psychologist_state_idx
  ON capacity_reservation (psychologist_id, state);

-- Trigger-based overlap check: reject INSERT/UPDATE if any active/confirmed row overlaps.
-- Overlap definition: a.starts_at < b.effective_end AND b.starts_at < a.effective_end
-- effective_end = ends_at + (2 * buffer_minutes * 60 seconds)
CREATE TRIGGER capacity_reservation_no_overlap_insert
BEFORE INSERT ON capacity_reservation
WHEN NEW.state IN ('hold_active', 'confirmed')
BEGIN
  SELECT RAISE(ABORT, 'capacity_overlap')
  WHERE EXISTS (
    SELECT 1 FROM capacity_reservation existing
    WHERE existing.psychologist_id = NEW.psychologist_id
      AND existing.state IN ('hold_active', 'confirmed')
      AND existing.id != NEW.id
      AND datetime(existing.starts_at) < datetime(NEW.ends_at, '+' || (NEW.buffer_minutes * 2) || ' minutes')
      AND datetime(NEW.starts_at) < datetime(existing.ends_at, '+' || (existing.buffer_minutes * 2) || ' minutes')
  );
END;

CREATE TRIGGER capacity_reservation_no_overlap_update
BEFORE UPDATE ON capacity_reservation
WHEN NEW.state IN ('hold_active', 'confirmed')
BEGIN
  SELECT RAISE(ABORT, 'capacity_overlap')
  WHERE EXISTS (
    SELECT 1 FROM capacity_reservation existing
    WHERE existing.psychologist_id = NEW.psychologist_id
      AND existing.state IN ('hold_active', 'confirmed')
      AND existing.id != NEW.id
      AND datetime(existing.starts_at) < datetime(NEW.ends_at, '+' || (NEW.buffer_minutes * 2) || ' minutes')
      AND datetime(NEW.starts_at) < datetime(existing.ends_at, '+' || (existing.buffer_minutes * 2) || ' minutes')
  );
END;
```

D1/SQLite tidak mendukung `EXCLUDE USING GIST`; trigger memberikan equivalent enforcement dengan overhead per-insert/update. Untuk scale MVP (ratusan reservation per psikolog per minggu), overhead acceptable.

### 8. Aggregate & entity mapping

| Existing entity | Behaviour change |
|---|---|
| `AvailabilitySlot` | Tetap: representasi kandidat bookable capacity. Tidak ada reservation state. |
| `SlotHold` | Tetap: state hold + TTL. Saat `CreateSlotHold` sukses, **juga** insert `CapacityReservation` (`reservation_kind = 'hold'`, `state = 'hold_active'`). Saat `ExpireSlotHold` atau hold release, update `CapacityReservation.state` ke `released`/`expired`. |
| `Appointment` | Tetap: appointment record. Saat `confirmed`, **juga** insert `CapacityReservation` (`reservation_kind = 'confirmed'`). Saat `cancelled`/`rescheduled`/`no_show` final, update reservation state. |
| `Booking` | Tetap. Tidak ada perubahan. |
| `OfferSnapshot` | Tetap: snapshot `buffer_minutes` saat `CreateSlotHold`/`CreateBooking`. |
| `AuditRecord` | Tetap: audit setiap transition `CapacityReservation.state`. |

### 9. Command changes

Tidak ada command baru. Perubahan pada command existing:

- **`CreateSlotHold`**: tambah step atomic — setelah `AvailabilitySlot` validation, insert `CapacityReservation` (`reservation_kind = 'hold'`, `state = 'hold_active'`, `starts_at = slot.starts_at`, `ends_at = slot.ends_at`, `buffer_minutes = offer_snapshot.buffer_minutes`). Jika constraint menolak, return typed failure `capacity_overlap` dan rollback seluruh transaction.
- **`ExpireSlotHold`** dan **`ApplyVerifiedPaymentEvent`** (failure path): update `CapacityReservation.state` ke `released`/`expired`/`cancelled` dalam transaction yang sama.
- **`ApplyVerifiedPaymentEvent`** (success path): update `CapacityReservation.state` dari `hold_active` ke ... sebenarnya, reservation untuk confirmed Appointment adalah **row berbeda** dengan `reservation_kind = 'confirmed'` dan FK ke `Appointment`. Hold reservation di-mark `released` (`release_reason = 'booking_cancelled'`) dan confirmed reservation di-insert dengan `appointment_id` baru. Dua transaction ini atomic.
- **`DecideCancellation`** (approve path): update `CapacityReservation.state` ke `cancelled` (`release_reason = 'appointment_cancelled'`) untuk semua reservation terkait.
- **`RescheduleAction`**: original `CapacityReservation` di-mark `cancelled`; replacement `Appointment` membuat `CapacityReservation` baru dengan overlap check yang sama.

### 10. Acceptance criteria (test scenarios)

1. **Single-psychologist single-offering happy path**: psikolog Fuja, sesi 09:00–10:00, slot A. `CreateSlotHold` → `CapacityReservation` row 1 (`hold_active`). `ApplyVerifiedPaymentEvent` → reservation 1 released, reservation 2 (`confirmed`) inserted. No overlap detected.
2. **Same-psychologist different-offering overlap** (P1-02 evidence): psikolog Fuja, dua klien hold slot 09:00–10:00 dari offering berbeda (`online_individual` dan `online_couple_A`). `CreateSlotHold` kedua gagal dengan `capacity_overlap`. Reservation kedua tidak ada di DB.
3. **Same-psychologist different-offering adjacent (legitimate)**: psikolog Fuja, sesi 09:00–10:00 + sesi 10:30–11:30. Buffer 15 menit di kedua sisi = reservation efektif 08:45–10:15 dan 10:15–11:45. Boundary test: 10:15 == 10:15 (exclusive ends_at) → tidak overlap → allowed.
4. **Same-psychologist different-offering near-overlap (rejected)**: psikolog Fuja, sesi 09:00–10:00 + sesi 10:15–11:15. Reservation efektif 08:45–10:15 dan 10:00–11:30. Overlap detected pada 10:00–10:15 → rejected.
5. **Cross-psychologist same-time**: psikolog A sesi 09:00–10:00, psikolog B sesi 09:00–10:00. Tidak ada overlap pada `psychologist_id`. Allowed.
6. **Race condition**: dua `CreateSlotHold` concurrent untuk slot overlap pada psikolog yang sama. Satu sukses, satu reject. DB constraint sebagai backstop.
7. **Late-payment reacquisition**: hold expired (`released`), verified PaymentEvent arrives, `ApplyVerifiedPaymentEvent` attempt atomic claim untuk slot asli → jika masih free, reservation `confirmed` baru inserted → Appointment confirmed. Jika overlap dengan appointment baru di-held/dikonfirmasi orang lain → paid_late path (`ADR 0059`).
8. **Cancellation release**: `DecideCancellation` approve → reservation di-mark `cancelled`, eligible slot `AvailabilitySlot` tidak auto-`available` sampai ada `RegenerateFutureAvailability` atau sampai `ends_at < now()`.
9. **Couple package**: 3 appointment (A, B, joint) untuk psikolog Fuja. Masing-masing punya `CapacityReservation` `confirmed`. Tidak overlap di antara ketiganya (jadwal A, B, joint terpisah per hari atau per minggu).
10. **Per-offering buffer override**: offering A buffer 15 menit, offering B buffer 30 menit. Dua sesi adjacent 09:00–10:00 dan 10:00–11:00 dengan offering berbeda. Reservation efektif A = 08:45–10:15, B = 09:30–11:30. Overlap 09:30–10:15 → rejected.

## Consequences

Positive:

- Overlap detection atomic di level DB; tidak ada race condition lolos;
- Granularitas 30-menit membiarkan psikolog mengelola slot adjacent dengan presisi;
- TransitionBuffer simetris melindungi psikolog dari sesi back-to-back tanpa transisi;
- `CapacityReservation` terpisah dari `AvailabilitySlot` memungkinkan regenerasi slot tanpa kehilangan claim state;
- Per-offering buffer snapshot pada reservation mempertahankan historical semantics;
- Couple package (`ADR 0090`) kompatibel tanpa perubahan model participant;
- Late-payment (`ADR 0059`), cancellation (`ADR 0025`/`0051`), dan reschedule (`ADR 0011`/`0039`) menggunakan atomic claim yang sama.

Costs and constraints:

- Tambah satu tabel `capacity_reservation`; migration overhead;
- App-level precheck + DB constraint = dua lapis enforcement; developer wajib paham keduanya;
- Trigger-based enforcement di D1/SQLite menambah per-insert/update overhead (acceptable untuk MVP scale);
- 30-menit granularity membatasi fleksibilitas psikolog yang ingin 15-menit prep session — di luar MVP scope;
- Buffer simetris berarti total "waktu yang di-block" per sesi = 60 + 30 = 90 menit (untuk default 15-menit buffer); availability arithmetic harus menghitung ini;
- Couple package dengan tiga appointment 60-menit occupying 4.5 jam total waktu psikolog per package; perlu visibility di Admin workspace.

## Open follow-up

- Tutup `TBC-STACK-01` (Worker + D1 vs Supabase + Postgres) sebelum migration dieksekusi. DDL Postgres di §6 dan DDL D1/SQLite di §7 keduanya valid; pilih satu saat stack diputuskan.
- Performance test pada trigger-based overlap check di D1 untuk ratusan reservation per psikolog per minggu.
- Admin UI menampilkan effective reservation interval (start − buffer .. end + buffer) atau hanya sesi interval; rekomendasi: tampilkan sesi interval untuk klien-facing, reservation interval untuk Admin/psychologist-facing.
- Future-proof: jika offering baru membutuhkan duration ≠ 60 menit atau buffer ≠ 15 menit, model sudah accommodate via `buffer_minutes` per reservation dan `ends_at - starts_at` per slot generation.
- `RegenerateFutureAvailability` (`ADR 0061`) hanya mengurus `AvailabilitySlot`; tidak menyentuh `CapacityReservation` (yang diurus oleh `CreateSlotHold`/`ApplyVerifiedPaymentEvent`/`DecideCancellation`).

## Reference

- `ADR 0013-offering-specific-slots.md` — offering-specific slots, keputusan overlap
- `ADR 0041-transition-buffer.md` — 15-menit default buffer, snapshot semantics
- `ADR 0043-service-offering-overrides.md` — per-offering buffer override
- `ADR 0014-ten-minute-slot-hold.md` — SlotHold TTL 10 menit
- `ADR 0040-90-day-booking-horizon.md` — rolling horizon
- `ADR 0061-future-slot-regeneration.md` — regeneration boundaries
- `ADR 0042-offering-snapshot-at-intent.md` — OfferSnapshot
- `ADR 0059-late-payment-reconciliation.md` — late payment reacquisition
- `ADR 0090-couple-participant-model.md` — couple package compatibility
- `IMPLEMENTATION-GUIDE.md` §6.5, §8.2 — patched alongside this ADR
- `DOMAIN-MODEL.md` — patched alongside this ADR
- `PRD-GUIDELINE-REVIEW.md` Round 1 P1-02, TBC register TBC-CAPACITY-01 + TBC-BUFFER-01 — closed by this ADR
