# 90. Couple Package Participant Model

## Status

Accepted for MVP working model. Implements the participant, consent, visibility, notification, withdrawal, and ClientAccess decisions required to make the couple package (`ADR 0074`) bookable once business intake (`TBC-INTAKE-01`, `TBC-MINOR-01`, `TBC-COUPLE-LAUNCH-01`) is closed. This ADR does not close those intake TBCs and does not authorize couple day-one launch on its own; it defines the model that any couple booking will use.

## Ringkasan eksekutif (Bahasa Indonesia)

- Satu couple package = satu `Booking` + satu `PackagePurchase` + tiga `SessionEntitlement` + tiga `Appointment` (A, B, joint).
- Tiap orang yang hadir di couple booking adalah **`BookingParticipant`** dengan **party_role** tetap: `payer` (wajib satu, default partner A), `participant_a` (satu), `participant_b` (satu). Istri `joint_attendees` bukan role tambahan, melainkan label relasional antara A dan B pada Appointment joint.
- Tiap `Appointment` memiliki **`AppointmentParticipant`** yang merefer ke `BookingParticipant` dan menandai mode kehadiran (`individual_a` | `individual_b` | `joint_both`). Tiap participant tetap harus consent untuk appointment-nya sendiri.
- **Consent** dipisah per participant dan per jenis: `couple_consent` (mengikuti `CONSENTS` di JSON operasional), `participant_consent_a`, `participant_consent_b`, `joint_session_consent` (ditandatangani sebelum Appointment joint). Consent wordings tetap mengikuti sign-off klinis/etis (`ADR 0082`, `TBC-CONSENT-01`).
- **Visibility**: payer/partner A dan partner B saling melihat hanya data operasional minimum yang dibutuhkan untuk kehadiran (nama tampilan, jadwal appointment masing-masing, mode, link join). Mereka **tidak** melihat jadwal appointment individual partner lain, isi consent partner lain, atau data klinis/transactional partner lain di luar couple record.
- **Notification** untuk payment/booking confirmation/reminder dikirim ke semua participant (email otomatis; WhatsApp opsional per `ADR 0066`). Reminder default 24 jam & 2 jam mengikuti `ADR 0052`; copy menyebut "sesi Anda" (bukan menyebut partner).
- **Withdrawal / no-show**:
  - Satu partner `no_show` pada appointment individual → appointment `no_show`, entitlement unit ke-1 atau ke-2 ter-konsume mengikuti `ADR 0027`. Sesi joint tetap dapat dijadwalkan karena entitlement joint (ke-3) belum ter-konsume.
  - Satu partner mundur dari sesi joint sebelum mulai → joint appointment di-cancel, entitlement ke-3 **di-restore** selama package masih valid; sesi joint dapat di-reschedule via Admin jika kedua partner masih同意.
  - Kedua partner tidak hadir di joint → joint `no_show`, entitlement ke-3 ter-konsume.
  - Withdrawal sebelum appointment sama dengan cancellation request biasa melalui Admin WhatsApp (`ADR 0067`).
- **Reschedule authority**: hanya Admin atau Psychologist (bukan Client/guest) yang boleh mengajukan reschedule appointment A/B/joint. Reschedule mengikuti `RescheduleAction` existing dan menciptakan replacement Appointment; original dimark `rescheduled`.
- **ClientAccess scope** untuk couple: token `couple_access` yang terikat ke `BookingParticipant` (per partner). Tiap partner hanya melihat appointment di mana ia menjadi participant (A/B/joint). Payer (default partner A) menerima token billing. Tiap token tunak pada isolated session — partner tidak dapat melihat token partner lain.
- **Audit**: setiap perubahan state couple (recording participant, verifying consent, scheduling A/B/joint, reschedule, withdrawal, cancellation) menulis ke `AuditRecord` dengan `target_type = booking/couple | appointment | booking_participant | consent` dan `actor = admin | psychologist | system`. Pesan WhatsApp tidak menjadi audit source.
- **Defer ke post-MVP**: dynamic roleswap (payer B, "two payers", "third party"), guardian untuk joint session, package transfer ke psikolog lain, joint consent wording variasi budaya, multiple couple dalam satu booking, automatic reschedule proposal ke partner lain.

## Context

Launch catalog (`ADR 0074`, `IMPLEMENTATION-GUIDE.md:68–73`) mengkonfirmasi couple package dengan sequence A → B → joint, harga online Rp350.000 dan offline Rp550.000. Package ini confirmed launch scope, dan `SERVICE-POLICY-MATRIX-v0.1 §4C TBC` secara eksplisit menulis keputusan participant/consent/notification/withdrawal wajib sebelum couple live bookable.

Domain model saat ini (`DOMAIN-MODEL.md`, `CONTEXT.md`, `IMPLEMENTATION-GUIDE.md §4`) hanya mengenal satu `Client` per `Booking`. Tidak ada entitas yang menjelaskan:

1. siapa **payer** versus dua orang **service recipient** (partner A dan partner B);
2. bagaimana `ConsentRecord` dipisah untuk tiap partner dan untuk sesi joint;
3. apakah partner A melihat jadwal partner B;
4. siapa menerima konfirmasi, reminder, perubahan jadwal;
5. apa efek jika satu partner tidak hadir atau menarik diri di tengah sesi joint;
6. siapa berwenang mengajukan reschedule appointment A/B/joint;
7. bagaimana `ClientAccess` di-scope untuk couple (per-participant atau per-booking).

Tanpa model ini, implementasi couple akan menebak keputusan bisnis, menggandakan Client record tanpa hubungan eksplisit, atau membocorkan jadwal individual partner ke partner lain. Round 3 (`PRD-GUIDELINE-REVIEW.md`) sudah memilih Mode A untuk cancellation/refund dan menjaga keputusan participant sebagai blocker terpisah. ADR ini menjawab blocker participant tanpa menyentuh blocker intake/minor/eligibility.

## Diskusi multi-perspektif

### Privacy (klinis/etis)

- Tiap partner punya ruang privat. Partner A tidak boleh melihat apakah partner B sudah booking sesi A-nya, sudah selesai, atau menarik diri. Yang relevan untuk A hanya "apakah sesi joint dapat berlangsung sesuai jadwal".
- Consent dipisah per participant (`participant_consent_a`, `participant_consent_b`, `joint_session_consent`). Wording joint session consent harus eksplisit menyebut: (a) sesi akan dihadiri A dan B bersama psikolog; (b) yang dicatat hanya metadata kehadiran dan outcome administratif; (c) bukan catatan klinis gabungan; (d) partner boleh menarik consent dan membatalkan sesi joint tanpa efek ke sesi A/B individual yang sudah selesai (asumsi: sesuai sign-off klinis).
- `CoupleRecord` tidak boleh menjadi implicit shared record. Ia adalah derivasi dari relasi antar `BookingParticipant` dalam satu `Booking`; tidak ada tabel terpisah yang menggandakan data partner.
- `PrivacyRequest` dari satu partner hanya memproses data partner tersebut. Ia tidak dapat menghapus `BookingParticipant` partner lain atau Appointment joint. Redaksi (`ADR 0087`) menjaga referensi pseudonymous per partner.

### Operations (admin/finance)

- Payer adalah default partner A (yang melakukan checkout), tetapi `payer_party_role` adalah field eksplisit pada `BookingParticipant` dan dapat di-set ke partner B atau ke participant "payer_only" (kerabat/pihak ketiga) jika memang perlu — operasi ini tetap **DEFERRED**, dan MVP hanya support payer = partner A.
- Tidak ada joint payment splitting. `Payment` dicatat sekali pada level `Booking` dengan amount = package price (snapshotted). Tidak ada partial allocation per participant.
- Withdrawal/no-show satu partner tidak otomatis memicu refund. Refund adalah purchase-level decision Admin (`ADR 0063`, `ADR 0077`), full/no-refund only. Sesi individual yang `no_show` tetap men-konsume entitlement (`ADR 0027`); ini harus dijelaskan di operator runbook agar Admin tidak keliru menawarkan refund parsial.
- Reschedule appointment joint memerlukan konfirmasi Admin bahwa kedua partner masih同意. Operator melihat ini sebagai "package lifecycle event" yang ter-audit, bukan transaksional biasa.

### Engineering (aggregate & schema)

- `BookingParticipant` adalah child entity dari `Booking`. Ia memiliki invariant: dalam satu couple Booking harus ada tepat dua participant dengan `party_role` ∈ {`participant_a`, `participant_b`} dan tepat satu dengan `party_role = payer`. Triple-role uniqueness adalah constraint level schema, bukan application logic.
- `AppointmentParticipant` adalah child entity dari `Appointment`. Untuk appointment A: 1 row dengan `attendance_mode = individual_a`; B: 1 row `individual_b`; joint: 2 rows `joint_both` (satu untuk A, satu untuk B). `joint_attendees` adalah derivasi (relational label) bukan role tambahan.
- Aggregate root couple adalah `Booking` (dengan `PackagePurchase`). `AppointmentParticipant` tidak berdiri sendiri; mutasi kehadiran melewati command yang membawa `booking_id` + `participant_party_role`. Ini menjamin atomicity: perubahan status satu appointment tidak dapat mengamputasi relasi couple.
- `SessionEntitlement` adalah unit paket (bukan participant). Entitlements dimilki oleh `PackagePurchase`; konsumsi terjadi via `AppointmentOutcome` (`ADR 0015`). Status entitlement tidak terikat ke participant — withdrawal A men-konsume entitlement ke-1 (untuk A) atau ke-3 (untuk joint withdrawal A saja).
- Schema D1: tambahkan tabel `booking_participant` dan `appointment_participant` dengan FK ke `booking`/`appointment`, unique constraint `(booking_id, party_role)`, dan unique constraint `(appointment_id, party_role)` (untuk mode individual) atau composite `(appointment_id, booking_participant_id)` unique (untuk mode joint, agar A dan B keduanya terdaftar). Migrations harus reversible.
- Idempotency: command `RecordCoupleParticipant` dan `VerifyCoupleConsent` membawa `idempotency_key` dan `commandId` per `IMPLEMENTATION-GUIDE.md §5.2`. Duplicate call return existing record tanpa side effect.

### UX (intake flow)

- Checkout couple menampilkan tiga langkah setelah pilih slot pertama: (1) data partner A sebagai payer (nama, email, telepon opsional, usia); (2) data partner B (nama, email, telepon opsional, usia, relasi); (3) consent wording per partner. Copy menyebut "Anda dan partner" dan "sesi Anda"; tidak menyebut "sesi pasangan" yang menyerupai klaim relasi tetap.
- Intake B tidak memerlukan partner A me-relay email; sistem mengirim magic link ke partner B secara independen untuk verifikasi identitas (`ADR 0020`). Verifikasi B adalah prasyarat sesi B dan joint; sesi A dapat berlangsung walau B belum verifikasi.
- Reminder menyebut appointment "Anda" saja (tidak menyebut "Anda dan partner A/B"). Untuk appointment joint, reminder menyebut "sesi joint Anda" dan meminta kedua partner mengkonfirmasi kehadiran via ClientAccess masing-masing.
- Halaman "booking saya" untuk partner A dan partner B berbeda: masing-masing hanya melihat appointment di mana ia terdaftar sebagai participant. Tiada cross-partner view di luar Admin workspace.

## Decision

Model couple package menggunakan dua entitas baru (`BookingParticipant`, `AppointmentParticipant`), dua party role inti (`payer`, `participant_a`, `participant_b`), dan satu label relasional (`joint_attendees`). Spec lengkap:

### 1. Aggregate & entities

#### 1.1 `BookingParticipant`

Child of `Booking`. Satu couple Booking memiliki tepat dua `BookingParticipant` rows untuk A dan B, dan satu di antaranya ditandai `is_payer = true`. Tiap row membawa:

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | primary key |
| `booking_id` | uuid | FK ke `Booking`, unique dengan `(booking_id, party_role)` |
| `party_role` | enum | `participant_a` \| `participant_b` |
| `is_payer` | bool | tepat satu true per couple booking |
| `display_name` | string | nama tampilan (bukan nama legal) |
| `contact_email` | string | email terverifikasi, wajib untuk ClientAccess |
| `contact_phone` | string \| null | opsional, untuk Admin WhatsApp manual support |
| `age_at_booking` | int \| null | snapshot usia saat booking; tidak di-update |
| `relationship_to_other` | enum \| null | `spouse` \| `partner` \| `other` — snapshot, tidak dimutasi |
| `consent_version` | string | versi consent yang di-accept participant ini |
| `consent_record_id` | uuid | FK ke `ConsentRecord` |
| `consent_status` | enum | `pending` \| `verified` \| `withdrawn` |
| `created_at` | timestamp | Asia/Jakarta |
| `updated_at` | timestamp | |

Invariant: `(booking_id, party_role)` unique. Tidak boleh ada participant ketiga. Payer harus salah satu dari A atau B (default A); MVP tidak mendukung external payer.

#### 1.2 `AppointmentParticipant`

Child of `Appointment`. Tiap Appointment memiliki rows:

- Appointment A → 1 row, `(party_role = participant_a, attendance_mode = individual_a)`
- Appointment B → 1 row, `(party_role = participant_b, attendance_mode = individual_b)`
- Appointment joint → 2 rows, `(party_role = participant_a, attendance_mode = joint_both)` dan `(party_role = participant_b, attendance_mode = joint_both)`

Field:

| Field | Tipe | Keterangan |
|---|---|---|
| `id` | uuid | primary key |
| `appointment_id` | uuid | FK ke `Appointment` |
| `booking_participant_id` | uuid | FK ke `BookingParticipant` |
| `party_role` | enum | `participant_a` \| `participant_b` (denormalized untuk query) |
| `attendance_mode` | enum | `individual_a` \| `individual_b` \| `joint_both` |
| `presence_status` | enum | `expected` \| `present` \| `absent` \| `withdrawn_pre_session` \| `withdrawn_mid_session` |
| `last_updated_by` | enum | `psychologist` \| `admin` \| `system` |
| `created_at` / `updated_at` | timestamp | |

Invariant: untuk appointment A/B, `(appointment_id, party_role)` unique. Untuk joint, `(appointment_id, booking_participant_id)` unique dan tepat dua rows.

### 2. Party roles & relationships

| Role | Definisi | Boleh jadi payer? | Boleh menerima notifikasi? | Boleh memiliki ClientAccess? |
|---|---|---|---|---|
| `payer` | label iuran (saat ini = partner A atau B) | ya (wajib satu) | ya | ya |
| `participant_a` | partner A, attend appointment A dan joint | ya (default) | ya | ya |
| `participant_b` | partner B, attend appointment B dan joint | ya (DEFERRED ke post-MVP) | ya | ya |
| `joint_attendees` | label relasional, bukan role; menandai bahwa appointment joint dihadiri A & B | n/a | n/a | n/a |

MVP: `payer` = `participant_a` by default. Mengubah payer ke `participant_b` adalah Admin-only action yang memerlukan field reason dan audit; ini DEFERRED.

### 3. Consent

Tiga ConsentRecord per couple booking:

1. **`couple_consent`**: consent umum couple package (tujuan, kerahasiaan, data, batasan). Ditandatangani payer pada saat checkout.
2. **`participant_consent_a`** / **`participant_consent_b`**: consent individu partner A atau B, termasuk verifikasi identitas via email magic link (`ADR 0020`). Consent B tidak menunggu consent A; dan sebaliknya.
3. **`joint_session_consent`**: consent khusus sesi joint, ditandatangani kedua partner sebelum appointment joint dimulai (cut-off default = sebelum reminder 24 jam). Wording harus secara eksplisit menyebut:
   - sesi joint dihadiri A dan B bersama psikolog;
   - yang dicatat hanya metadata kehadiran dan outcome administratif;
   - sesi bukan catatan klinis gabungan;
   - partner boleh menarik consent dan membatalkan sesi joint tanpa efek ke sesi A/B individual yang sudah selesai.

Semua wording tetap mengikuti sign-off klinis/etis (`ADR 0082`, `TBC-CONSENT-01`). ConsentRecord immutable per `IMPLEMENTATION-GUIDE.md §8.1`.

### 4. Visibility & notification

**Visibility antar partner** (read scope):

| Data | Partner A melihat? | Partner B melihat? | Admin melihat? | Psychologist melihat? |
|---|---|---|---|---|
| Jadwal appointment A | ya (own) | tidak | ya | ya (assigned) |
| Jadwal appointment B | tidak | ya (own) | ya | ya (assigned) |
| Jadwal appointment joint | ya | ya | ya | ya |
| Display name partner lain | ya (untuk joint prep) | ya (untuk joint prep) | ya | ya (untuk joint prep) |
| Email/phone partner lain | tidak | tidak | ya | tidak |
| Consent record partner lain | tidak | tidak | ya (audit) | tidak |
| Outcome appointment individual partner lain | tidak | tidak | ya | tidak |
| Payment/PaymentEvent amount | ya (payer) | ya (payer) | ya | tidak |

**Notification** mengikuti `IMPLEMENTATION-GUIDE.md §10`:

- Email otomatis ke semua participant yang terverifikasi (per appointment).
- Reminder default 24 jam & 2 jam ke masing-masing participant untuk appointment di mana ia terdaftar. Reminder untuk appointment individual menyebut "sesi Anda" (tidak menyebut partner). Reminder joint menyebut "sesi joint Anda" dan meminta konfirmasi via ClientAccess masing-masing.
- Schedule change/reschedule dikirim ke semua participant yang terdampak, per scope di atas.
- WhatsApp: opsional manual support per `ADR 0066`. Tidak ada lifecycle trigger.
- Copy public tidak boleh menyebut "joint appointment" tanpa menyebut "Anda" / tanpa konteks. Copy berikut aman: "Sesi joint Anda akan berlangsung pada [tanggal], [waktu]".

### 5. Withdrawal / no-show effects

| Event | Appointment state | Entitlement effect | Package effect | Notification |
|---|---|---|---|---|
| Partner A tidak hadir di appointment A | Appointment A → `no_show` | Entitlement #1 ter-konsume (`ADR 0027`) | none | reminder normal, hasil ke Admin |
| Partner B tidak hadir di appointment B | Appointment B → `no_show` | Entitlement #2 ter-konsume | none | sama |
| Salah satu partner mundur dari appointment joint sebelum mulai | Appointment joint → `cancelled` (via CancellationDecision) | Entitlement #3 di-restore (joint cancellation di luar `ADR 0027` grace; keputusan Admin) | none | notifikasi ke kedua partner + Admin |
| Salah satu partner mundur dari appointment joint di tengah sesi | Appointment joint → `completed` (oleh psikolog) | Entitlement #3 ter-konsume | none | notifikasi outcome ke kedua partner |
| Kedua partner tidak hadir di joint | Appointment joint → `no_show` | Entitlement #3 ter-konsume | none | notifikasi ke Admin |
| Withdrawal sebelum appointment (tanpa hadiri) | mengikuti CancellationRequest → CancellationDecision (approve/deny) |ikuti cancellation matrix `ADR 0025`/`ADR 0051`/CancellationDecision atomic | none | sesuai cancellation decision |

Refunds tetap purchase-level decision (`ADR 0063`). Withdrawal/no-show tidak otomatis menghasilkan refund; Admin dapat memutuskan `full_refund` atau `no_refund` setelah review kasus per kasus (`ADR 0076`, `ADR 0077`).

### 6. Reschedule authority

- Admin dan Psychologist boleh mengajukan `RescheduleAction` untuk appointment A/B/joint.
- Client/guest (termasuk partner via ClientAccess) **tidak** boleh mengajukan reschedule appointment A/B/joint. Perubahan jadwal oleh partner harus melalui Admin WhatsApp (`ADR 0067`).
- Reschedule mengikuti `IMPLEMENTATION-GUIDE.md §6.1` invariants: original Appointment dimark `rescheduled`, replacement Appointment dibuat. Untuk sesi joint, replacement harus tetap dalam masa berlaku package dan masih menghormati kedua participant.
- Notification perubahan jadwal dikirim ke seluruh participant sesuai visibility matrix §4.

### 7. ClientAccess scope

- Tiap partner memiliki token `couple_access` terikat ke `BookingParticipant`-nya, scoped ke:
  - appointment di mana ia menjadi participant (read-only ClientAccess projection);
  - tidak dapat melihat appointment individual partner lain;
  - tidak dapat melakukan mutation (cancellation/refund).
- Token mengikuti mekanisme `ADR 0020`: email magic link 15 menit, scoped session 30 menit, resend invalidate. Tidak ada token bersama.
- Payer (`is_payer = true`) menerima juga token `couple_billing_access` scoped ke payment/refund record Booking (read-only).
- `PrivacyRequest` dari satu partner hanya返还 data partner tersebut.

### 8. Commands baru

Tambah dua command ke `IMPLEMENTATION-GUIDE.md §5.2`:

- **`RecordCoupleParticipant`** — mendaftarkan `BookingParticipant` (A atau B) untuk satu `Booking`. Input: `booking_id`, `party_role`, `display_name`, `contact_email`, `contact_phone` (opsional), `age_at_booking` (opsional), `relationship_to_other`, `consent_version`. Precondition: Booking belum memiliki participant dengan role tersebut; `VerifyCoupleConsent` untuk partner yang relevan sudah dipanggil atau dipanggil atomik. Effect: insert `BookingParticipant`, trigger magic link verifikasi email ke partner.
- **`VerifyCoupleConsent`** — memverifikasi `ConsentRecord` untuk satu participant (A atau B atau joint). Input: `booking_id`, `party_role`, `consent_type` (`couple_consent` \| `participant_consent_a` \| `participant_consent_b` \| `joint_session_consent`), `consent_version`, `idempotency_key`. Effect: insert immutable `ConsentRecord`, update `BookingParticipant.consent_status` ke `verified` (atau tetap `pending` untuk joint jika partner lain belum consent).

Konsistensi dengan command existing: tidak menghapus/mengubah `CreateBooking`, `CreatePackagePurchase`, `ScheduleNextEntitlement`, `RequestCancellation`, `DecideCancellation`. Command baru hanya mendaftarkan participant dan consent.

### 9. Transition matrix Appointment A/B/joint

Untuk Appointment A atau B (mode individual):

| Dari | Event | Ke | Atomic effect |
|---|---|---|---|
| (none) | `ScheduleNextEntitlement` untuk A atau B | `scheduled` | buat `AppointmentParticipant` row untuk participant yang relevan |
| `scheduled` | verified PaymentEvent untuk purchase awal | `confirmed` | tidak ada perubahan participant |
| `scheduled` | RescheduleAction | `rescheduled` + replacement `scheduled` | pindahkan `AppointmentParticipant.attendance_mode` ke replacement |
| `confirmed` | psychologist menandai `completed` | `completed` | entitlement unit terkait ter-konsume; `presence_status = present` |
| `confirmed` | psychologist menandai `no_show` setelah grace 15 menit (`ADR 0028`) | `no_show` | entitlement ter-konsume; `presence_status = absent` |
| `confirmed` / `scheduled` | CancellationDecision approve | `cancelled` | entitlement di-restore jika package masih valid |
| `confirmed` / `scheduled` | CancellationDecision deny | tidak berubah | tidak ada mutation |

Untuk Appointment joint (mode `joint_both`, dua `AppointmentParticipant` rows):

| Dari | Event | Ke | Atomic effect untuk A | Atomic effect untuk B |
|---|---|---|---|---|
| (none) | `ScheduleNextEntitlement` untuk joint | `scheduled` | buat row `joint_both` untuk A | buat row `joint_both` untuk B |
| `scheduled` | `joint_session_consent` untuk A & B verified | `confirmed` | `presence_status = expected` | `presence_status = expected` |
| `confirmed` | psychologist menandai `completed` | `completed` | `presence_status = present` | `presence_status = present` |
| `confirmed` | satu partner absent di mid-session, psikolog tandai `completed` | `completed` | `presence_status = present` atau `withdrawn_mid_session` | `presence_status = present` atau `withdrawn_mid_session` |
| `confirmed` | satu partner mundur sebelum mulai, CancellationDecision approve | `cancelled` | `presence_status = withdrawn_pre_session` | `presence_status = withdrawn_pre_session` atau `present` (tergantung partner mana yang mundur) |
| `confirmed` | kedua partner absent, no-show grace 15 menit | `no_show` | `presence_status = absent` | `presence_status = absent` |

Entitlement #3 (joint) ter-konsume oleh `completed` atau `no_show` sesuai `ADR 0027`. Joint cancellation sebelum mulai me-restore entitlement #3 (di luar default grace consumption), melalui CancellationDecision yang explicit, dengan audit reason.

### 10. Audit

Setiap mutasi couple state menulis ke `AuditRecord`:

- `target_type`: `booking` \| `booking_participant` \| `appointment` \| `appointment_participant` \| `consent`
- `actor`: `admin` \| `psychologist` \| `system`
- `action`: `record_participant` \| `verify_consent` \| `schedule` \| `reschedule` \| `cancel` \| `withdraw` \| `mark_outcome`
- `correlation_id`: shared ID antar participant appointment joint
- `before/after`: minimum state representation (party_role, consent_status, presence_status), bukan PII partner

Pesan WhatsApp tidak menjadi audit source. Pesan admin dapat diringkas ke field `reason` (non-klinis, max 200 karakter).

## Open follow-up

- Tutup `TBC-INTAKE-01` (field intake final: nama, email, telepon opsional, consent version) sebelum couple booking UI live.
- Tutup `TBC-MINOR-01` (guardian route untuk 16–17): implikasi ke couple — perlu guardian consent untuk tiap participant di bawah 18? Defer ke post-MVP untuk joint session; individu 16–17 sudah tercakup.
- Tutup `TBC-COUPLE-LAUNCH-01` (day-one bookable atau deferred). Rekomendasi Round 2 = defer sampai participant model fix. ADR ini menutup participant model; launch decision tetap tinggal.
- Tutup `TBC-CONSENT-01` (final wording `joint_session_consent`) dengan sign-off klinis/etis sebelum couple booking UI live.
- `TBC-NOTIFY-01` (email copy couple-specific) tetap terbuka.
- Defer ke post-MVP: dynamic payer swap ke participant B, external/third-party payer, package transfer ke psikolog lain untuk joint, multi-couple dalam satu Booking, automatic reschedule proposal.

## Reference

- `ADR 0074-launch-counseling-catalog-prices.md` — couple package sequence dan harga
- `ADR 0075-one-confirmed-launch-psychologist.md` — Fuja sebagai satu-satunya psikolog launch
- `ADR 0066-flexible-admin-whatsapp-support.md` — WhatsApp opsional manual support
- `ADR 0067-admin-cancellation-refund-workspace.md` — cancellation workspace
- `ADR 0076-case-by-case-cancellation.md` — tidak ada auto-cutoff
- `ADR 0077-launch-full-or-no-refund.md` — refund vocabulary
- `ADR 0020-scoped-guest-access.md` — ClientAccess scoped
- `ADR 0025-cancellation-pending-reservation.md` — pending preserves reservation
- `ADR 0026-entitlement-consumption.md` — completed/no_show consumes
- `ADR 0027-no-show-consumption.md` — no_show grace consumption
- `ADR 0028-no-show-grace-period.md` — 15-minute grace
- `ADR 0051-cancellation-decision-record.md` — CancellationDecision approve/deny
- `ADR 0063-package-refund-at-purchase-level.md` — purchase-level refund
- `ADR 0082-joint-privacy-consent-signoff.md` — joint sign-off ownership
- `ADR 0087-client-redaction-pseudonymization.md` — redaction
- `IMPLEMENTATION-GUIDE.md` §4.2, §5.2, §6.2, §10 — patched alongside this ADR
- `DOMAIN-MODEL.md` — patched alongside this ADR
- `CONTEXT.md` — patched alongside this ADR
- `PRD-GUIDELINE-REVIEW.md` — TBC-COUPLE-01 closed, TBC-COUPLE-LAUNCH-01 dependency