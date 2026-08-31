# Seraya Psikologi — Review PRD dan Implementation Guide

## Status review

**Read-only artifact audit.** Review ini tidak mengubah PRD, ADR, domain model, atau implementation guide.

## Executive verdict

| Area | Verdict |
|---|---|
| Diskusi/domain exploration | Kuat dan bernilai; keputusan inti sudah banyak |
| PRD/design handoff | **Boleh dengan catatan**: source drift dan TBC harus terlihat |
| Architecture-neutral foundation | **Boleh mulai sebagian**: vocabulary, error model, fake clock, test fixtures, idempotency primitives |
| Database schema/migrations | **Belum boleh dikunci**: stack/persistence dan aggregate boundary konflik |
| End-to-end feature implementation | **Belum implementation-ready** |
| Production launch | **Belum siap** dan memang masih gated |

`IMPLEMENTATION-GUIDE.md` lebih matang daripada dua form PRD, tetapi statusnya saat ini terlalu kuat. Label **“Implementation Baseline — boleh dipakai sebagai pegangan implementasi”** perlu diturunkan menjadi **conditional draft** sampai blocker P0 diselesaikan.

## Source yang diaudit

1. `seraya-psikologi-prd-nonteknis-filled-rev46.html`
2. `seraya-psikologi-prd-teknis-filled-rev168.html`
3. Live PRD readback:
   - Non-Teknis revision 46;
   - Teknis revision 170.
4. `IMPLEMENTATION-GUIDE.md` — 679 baris.
5. `DOMAIN-MODEL.md` — 178 baris.
6. `CONTEXT.md` — 285 baris.
7. Seluruh **88 ADR** di `docs/adr/`:
   - 87 berstatus accepted/accepted-for-planning dalam berbagai bentuk;
   - ADR 0064 berstatus superseded, tetapi status/body-nya masih membawa keputusan yang bertentangan.
8. Form serializer, server autosave, Worker API, dan D1 migration untuk memeriksa integritas source PRD.

## Completeness faktual

### PRD Teknis revision 168

- Form fields: **164**.
- Required fields: **156**.
- Raw JSON non-empty required values: **46**; raw empty required: **110**.
- Rendered-valid required fields: **43**; **113** tetap kosong di UI.
- Tiga required answer (`mvp_caps`, `client_auth`, `test_layers`) berisi narrative string yang tidak cocok dengan option value radio/checkbox, sehingga `apply()` tidak memilih option apa pun.

Missing required per section:

| Section | Missing |
|---|---:|
| Functional Requirements | 27 |
| Data Model & Classification | 39 |
| Booking, Payment & Concurrency | 1 |
| Payment Gateway Integration | 3 |
| Authentication & Authorization | 1 |
| Security, Privacy & Data Lifecycle | 4 |
| External Integrations | 22 |
| UX, Accessibility, Performance & SEO | 4 |
| Environments, CI/CD & Operations | 5 |
| Testing, UAT & Release | 1 |
| Decisions, Risks & Milestones | 3 |

### PRD Non-Teknis revision 46

- Form fields: **142**.
- Required fields: **78**.
- Raw JSON non-empty required values: **17**; raw empty required: **61**.
- Rendered-valid required fields: **15**; **63** tetap kosong di UI.
- Dua required answer (`profile_proof`, `landing_sections`) memakai value yang tidak ada dalam allowed option schema, sehingga tidak tampil sebagai pilihan tercentang.
- Dari 63 rendered gaps tersebut, 20 berasal dari fixed template Psychologist 2–5 yang tidak relevan bila hanya Fuja yang confirmed untuk launch.
- Setelah mengeluarkan fixed-repeat tersebut, masih ada **43 substantive rendered gaps**.

Kesimpulan: dua artifact bernama “filled PRD” sebenarnya masih merupakan **partially-filled forms**, bukan completed PRD. Unknown values juga mayoritas tetap kosong, bukan diberi ID `TBC-*` sebagaimana aturan yang diminta.

## Yang sudah kuat dan konsisten

Bagian berikut sudah cukup jelas lintas guide/domain model/ADR:

- hanya SERAYA PULANG yang bookable/paid pada launch;
- counseling lebih dulu; assessment deferred;
- online/offline, 60 menit;
- individual dan couple catalog/pricing tercatat;
- Fuja satu-satunya psychologist launch yang confirmed;
- clinical records, diagnosis, assessment result, transcript, dan session notes di luar MVP;
- Booking, Appointment, Payment, dan AvailabilitySlot adalah konsep berbeda;
- browser redirect bukan payment truth;
- signed/server-verified provider event menjadi PaymentEvent authority;
- late payment tidak boleh auto-assign slot alternatif;
- cancellation request, decision, dan refund action terpisah;
- cancellation approval + eligible release + entitlement restoration harus atomic;
- launch refund hanya `full_refund` atau `no_refund`;
- Google SSO tidak otomatis memberi staff access;
- StaffMembership/invite/allowlist wajib;
- WhatsApp adalah optional manual support, bukan lifecycle/source of truth;
- privacy boundary, redaction, pseudonymous minimum links, dan production gates sudah diarahkan dengan benar.

---

# Ranked findings

## P0 — blocker sebelum implementation baseline disahkan

### P0-01 — Product stack dan persistence belum benar-benar diputuskan

**Evidence**

- Technical PRD answer store: `database = "supabase"` (`teknis-embedded.json:25`).
- Technical PRD answer store: `architecture = "docker"` (`teknis-embedded.json:31`).
- Implementation guide menetapkan Cloudflare Worker + D1 (`IMPLEMENTATION-GUIDE.md:79`).
- Guide kemudian mewajibkan D1 migrations (`IMPLEMENTATION-GUIDE.md:378`, `:501`).
- Tidak ada architecture ADR di ADR 0001–0088 yang memilih D1/Worker untuk aplikasi booking.

**Why this blocks**

Slice 0 langsung meminta schema/migrations. Memilih D1 versus Supabase/Postgres mengubah concurrency enforcement, transaction model, migration tooling, backup/restore, auth integration, dan observability. Ini bukan detail reversible setelah schema dan repository dibangun.

**Required correction**

Buat satu architecture ADR aplikasi booking yang eksplisit memilih deployment runtime, database, transaction strategy, migration path, backup/restore, dan alasan budget/operational fit. Jangan menganggap infrastruktur website PRD sebagai arsitektur produk booking.

### P0-02 — Source-of-truth PRD tidak stabil dan canonical content dapat hilang

**Evidence**

- Technical snapshot revision 168 dan live revision 170 berbeda pada 11 key.
- Live revision 170 kehilangan tujuh key dari snapshot, termasuk `entity`, `client_auth`, `privacy`, `non_goals`, `integrations`, `availability`, dan `retention`.
- Enam canonical summary key revision 168 (`entity`, `privacy`, `non_goals`, `integrations`, `availability`, `retention`) tidak ada di form schema.
- Lima stored choice fields menggunakan value di luar option schema: Technical `mvp_caps`, `client_auth`, `test_layers`; Non-Teknis `profile_proof`, `landing_sections`. Nilainya ada di JSON tetapi tidak terlihat sebagai selected answer di UI.
- `currentData()` hanya menyalin element `[name]` yang dirender (`public/teknis.html:9`).
- Autosave melakukan whole-document PUT dari `currentData()` (`public/server-sync.js:72–81`).
- Worker mengganti seluruh JSON blob, bukan merge field-level (`src/index.ts:138–148`).
- D1 hanya menyimpan current document row; tidak ada revision-history table (`migrations/0001_init.sql:1–10`).

**Why this blocks**

Implementer tidak dapat mengetahui apakah field yang hilang adalah keputusan yang dicabut atau data yang terhapus. Authority order tidak berguna bila source yang lebih tinggi dapat kehilangan content tanpa audit/recovery.

**Required correction**

- Jangan simpan canonical decision dalam key yang tidak dirender/schema-owned.
- Putuskan satu canonical implementation document.
- Gunakan schema validation + merge/preserve semantics atau tolak unknown/omitted canonical fields.
- Tambahkan immutable revision snapshot/history sebelum melanjutkan collaborative editing.
- Reconcile live revision 170 terhadap closure snapshot 168 dengan review manusia, bukan overwrite otomatis.

### P0-03 — Couple package tidak memiliki participant, consent, dan access model

**Evidence**

- Couple package adalah confirmed launch scope dengan sequence partner A, partner B, joint (`IMPLEMENTATION-GUIDE.md:68–73`).
- Entity model hanya memiliki satu `Client` dan Booking-scoped ClientAccess; tidak ada Booking/Appointment participant entity (`IMPLEMENTATION-GUIDE.md:132–181`).
- ADR 0074 secara eksplisit menyatakan couple booking masih memerlukan participant identity/consent/communication model (`0074-launch-counseling-catalog-prices.md:53–60`).

**Why this blocks**

Tanpa model ini, implementer harus menebak:

- siapa payer versus service recipient;
- siapa yang menerima akses dan notifikasi;
- Appointment A/B/joint terhubung ke siapa;
- consent masing-masing partner;
- apakah satu partner boleh melihat jadwal/detail individual partner lain;
- perubahan participant dan cancellation scope.

Ini menyentuh data model, authorization, consent, Notification, dan package scheduling sekaligus.

**Required correction**

Tambahkan `TBC-COUPLE-01` dan putuskan model `BookingParticipant`/`AppointmentParticipant` atau ekuivalennya, role payer/recipient, consent per participant, visibility, contact ownership, dan client-access scope. Couple checkout tidak boleh diimplementasikan sebelum ini selesai.

### P0-04 — Booking eligibility dan minimum intake belum diputuskan

**Evidence**

PRD Non-Teknis masih kosong untuk:

- audience age (`aud_age`, line 11);
- needs/exclusions (`aud_needs`, `aud_exclusion`, lines 12–13);
- booking minimum intake (`booking_intake`, line 111);
- booking cutoff (`booking_cutoff`, line 112);
- minor/guardian policy (`booking_minor`, line 115);
- crisis/referral process (`crisis`, `referrals`, lines 142–143).

Guide hanya memberi kategori data yang boleh disimpan, bukan exact required fields atau eligibility rules (`IMPLEMENTATION-GUIDE.md:399–422`).

**Why this blocks**

Schema Client/Booking, validation, consent, UI copy, referral behavior, dan legal/clinical sign-off bergantung pada jawaban ini. Developer tidak boleh diam-diam memilih “adult only”, mengizinkan minor, atau mengumpulkan symptom narrative.

**Required correction**

Tambahkan paling tidak:

- `TBC-INTAKE-01` — exact transactional fields and validation;
- `TBC-MINOR-01` — under-18 eligibility/guardian consent;
- `TBC-ELIGIBILITY-01` — served/excluded audience and referral boundary;
- `TBC-BOOKING-CUTOFF-01` — minimum lead time/same-day behavior.

Mark sebagai blocker sebelum Slice 2, UAT booking, dan production.

---

## P1 — must-fix sebelum feature slice terkait

### P1-01 — Booking dan Appointment state machine masih tercampur

**Evidence**

- Context menegaskan Booking dan Appointment berbeda (`CONTEXT.md:11–21`).
- Guide menulis satu flow `Create Booking → pending_payment → confirmed → completed/no_show/cancelled/rescheduled` (`IMPLEMENTATION-GUIDE.md:252–267`).
- `completed`, `no_show`, dan `rescheduled` adalah Appointment semantics, bukan otomatis Booking state.
- Guide sendiri mensyaratkan aggregate ownership clear sebelum implementation-ready (`IMPLEMENTATION-GUIDE.md:648–655`), tetapi tidak mendefinisikan aggregate roots atau command transaction boundaries.
- Semua Functional Requirement ID/rules/acceptance fields masih kosong (`teknis-embedded.json:34–60`).
- `AvailabilityModule` dan `BookingModule` sama-sama memiliki responsibility atas hold creation/expiry (`IMPLEMENTATION-GUIDE.md:192–196`), sementara Payment, Package, Cancellation, dan Refund perlu mengubah state lintas modul tanpa application orchestrator/unit-of-work seam (`:197–207`).

**Required correction**

Tulis transition table terpisah untuk:

- Booking;
- SlotHold;
- Appointment;
- Payment;
- PackagePurchase;
- SessionEntitlement;
- CancellationRequest/Decision;
- RefundAction.

Untuk setiap transition: command, precondition/version, actor, atomic writes, emitted event, idempotency key, typed failure, dan forbidden transition. Tetapkan aggregate ownership dan cross-aggregate transaction strategy.

### P1-02 — Capacity overlap dan TransitionBuffer belum implementable

**Evidence**

- Guide menyebut Availability sebagai CONFIRMED (`IMPLEMENTATION-GUIDE.md:327–336`).
- ADR 0013 masih membuka candidate-slot granularity, overlap strategy, dan exact concurrency mechanism (`0013-offering-specific-slots.md:27–35`).
- ADR 0041 masih membuka apakah 15-minute buffer diterapkan before, after, atau both sides (`0041-transition-buffer.md:33–35`).
- Technical PRD required field `buffer` masih kosong (`teknis-embedded.json:106`).
- Tidak ada TBC khusus untuk dua keputusan tersebut di guide.

**Why this matters**

Offering-specific candidate slots dapat saling overlap untuk psikolog yang sama. Unique constraint per slot tidak cukup mencegah double booking lintas offering/duration.

**Required correction**

Tambahkan `TBC-CAPACITY-01` dan `TBC-BUFFER-01`. Putuskan interval model, buffer placement, slot granularity, atomic overlap-claim mechanism, dan database constraint/transaction strategy sebelum Slice 1 availability atau Slice 2 hold.

### P1-03 — SlotHold TTL tidak terikat ke payment expiry

**Evidence**

- SlotHold default 10 menit (`IMPLEMENTATION-GUIDE.md:271`).
- Launch methods mencakup QRIS dan bank transfer/VA (`IMPLEMENTATION-GUIDE.md:360–370`).
- Exact provider expiry behavior masih TBC-PAY-01 (`:370`).
- Late success selalu masuk reacquisition/manual reconciliation path (`:263–267`).

**Required correction**

Definisikan invariant antara checkout/payment expiry dan SlotHold TTL per enabled method, client-visible countdown/message, kapan payment intent ditutup/expired, dan expected treatment untuk provider success setelah hold expiry. Adapter/fake dapat dibuat, tetapi production payment flow tidak boleh disahkan sebelum ini.

### P1-04 — `CONTEXT.md` dan beberapa ADR masih membawa semantics yang sudah ditolak

**Direct contradictions**

1. `CONTEXT.md:181` menyebut WhatsApp-capable number required, sedangkan ADR 0066 lines 13–18 dan guide lines 458–466 menyatakannya optional.
2. ADR 0064 status line 5 mengklaim required WhatsApp contact tetap valid, sedangkan ADR 0066 secara eksplisit menggantinya dengan optional contact.
3. `CONTEXT.md:219` masih menyebut cancellation policy full/partial/no-refund tanpa menjelaskan partial deferred.
4. `CONTEXT.md:231` memberi CancellationDecision outcome approve/deny/partial/other, bertentangan dengan ADR 0077 lines 15–19.
5. `CONTEXT.md:271` masih mendeskripsikan RefundAction full/partial.
6. `CONTEXT.md:117–131` dan ADR 0030 menyebut Editor aktif dalam MVP, sedangkan ADR 0079 menunda Editor dari launch.
7. ADR 0077 open follow-up masih meminta approval role/separation, padahal ADR 0078 sudah memutuskan one-Admin separate actions.
8. ADR 0079 open follow-up masih meminta identity provider, padahal ADR 0080 sudah memilih Google SSO.

**Required correction**

Patch status/follow-up dari ADR lama dengan explicit “superseded by” pointer dan update `CONTEXT.md` sebagai current-state glossary. Historical decision body boleh dipertahankan, tetapi status/current implication tidak boleh ambigu.

### P1-05 — Security, staff session, dan operations belum punya acceptance baseline

**Evidence**

Technical PRD required fields kosong:

- RLS/database authorization (`rls`, line 117);
- secrets (`secrets`, line 121);
- logging/redaction (`logging`, line 122);
- backup/restore (`backup`, line 125);
- threat model (`threats`, line 126);
- environments/CI/CD/observability/alerts/runbooks (`lines 156–160`);
- test data/privacy (`line 164`).

Guide menjelaskan authorization intent, tetapi belum menetapkan Google OAuth state/nonce/session/cookie/CSRF/re-auth/revocation/recovery behavior. `TBC-ACCESS-01` hanya membahas ClientAccess, bukan staff sessions.

**Required correction**

Tambahkan `TBC-STAFF-SESSION-01` dan concrete security/operations acceptance sebelum Slice 5 atau payment production integration. Architecture ADR harus menentukan backup/restore dan operational ownership.

### P1-06 — Guideline belum menjadi full website implementation guide

**Evidence**

PRD Non-Teknis masih kosong untuk:

- positioning differentiator/tone;
- audience/persona;
- price-display choice;
- booking confirmation/support/channels;
- hero copy/CTA/proof claims/FAQ;
- brand voice/assets;
- website data, crisis copy, legal documents.

`support`, `channels`, `confirmation`, dan `reminders` juga kosong, padahal email menjadi dependency ClientAccess, konfirmasi, reminder, dan perubahan status. `TBC-NOTIFY-01` belum diklasifikasikan tegas sebagai production gate.

Guide menyebut marketing/CMS in scope, tetapi required module list tidak memiliki `ContentModule`; `CrisisNotice` dari domain context tidak ada di minimum entity/module/command list. Accessibility hanya berupa generic UAT item; tidak ada measurable accessibility/performance/SEO acceptance.

**Required correction**

Pisahkan readiness:

- backend/domain implementation;
- public marketing/content implementation;
- operations/admin implementation.

Tambahkan ContentModule/CrisisNotice atau eksplisit defer; mark content, claims, crisis/referral, legal copy, accessibility/performance/SEO sebagai TBC/gate yang jelas. Jangan menyebut full website implementation-ready sebelum bagian ini tersedia.

### P1-07 — Package validity TBC terlalu luas sekaligus belum punya nilai bisnis

**Evidence**

- Guide mengatakan “exact package validity/expiry calendar semantics” TBC (`IMPLEMENTATION-GUIDE.md:290`).
- ADR 0055 sudah memutuskan calendar-period model dan snapshot concrete expiry (`0055-calendar-package-validity.md:11–15`).
- Yang masih open adalah actual duration value, allowed units/range, end-of-month policy, local expiry time, dan extension authority.

**Required correction**

Persempit `TBC-PACKAGE-01`; jangan membuka ulang keputusan calendar-period yang sudah accepted. Mark actual launch package validity value dan expiry-boundary policy sebagai blocker sebelum package checkout/publication.

### P1-08 — Entity dan command catalog belum sinkron

Contoh entity/operation yang muncul di Context/ADR/Domain Model tetapi tidak lengkap di guide:

- couple participant/consent model;
- `CrisisNotice`;
- `ClientMergeAction`;
- `PackageAvailabilityResolution`;
- explicit late-payment reconciliation record;
- explicit extension exception/action;
- `CorrectAppointmentOutcome` command;
- ContentModule/content commands.

**Required correction**

Buat one-page aggregate/entity catalog dengan status `launch`, `supporting`, `deferred`, atau `TBC`. Setiap launch entity harus punya owner module dan lifecycle; setiap accepted command harus punya input/precondition/result/failure contract.

### P1-09 — Authority order dan handoff gate saling bertentangan

**Evidence**

- Guide source note mengatakan accepted ADR + guide menjadi authority sampai live form direconcile (`IMPLEMENTATION-GUIDE.md:9–15`).
- Authority order justru menempatkan Technical PRD revision 168 di atas guide dan tidak memasukkan Non-Teknis PRD/Domain Model (`:19–28`).
- `TBC-LIVE-PRD-01` diberi gate “before implementation handoff” (`:644`).
- Guide kemudian mengatakan implementation/design handoff dapat proceed now (`:666`).

**Required correction**

Gunakan authority matrix per concern, bukan satu linear order. Contoh:

- business scope/catalog/content: reviewed Non-Teknis decisions + latest accepted ADR;
- domain semantics: current Context + latest accepted ADR;
- implementation behavior: reviewed Implementation Guide;
- live form: collaboration input, bukan otomatis canonical bila belum reconciled.

### P1-10 — Payment/Refund projection, uniqueness, dan package-refund effects belum tertutup

**Evidence**

- Technical summary menyebut Payment sebagai “append-only original transaction” (`teknis-embedded.json:103`), tetapi Payment juga membutuhkan current status projection; yang benar-benar append-only adalah provider events/attempt records.
- Guide membatasi cumulative refund agar tidak melebihi captured amount (`IMPLEMENTATION-GUIDE.md:323`), tetapi belum mendefinisikan business uniqueness, concurrent duplicate-refund prevention, atau current/refund-attempt projection.
- Context mengizinkan multiple payment attempts, tetapi belum ada invariant **at-most-one successful settlement** per Booking/purchase intent. Provider-event idempotency saja tidak mencegah dua Payment berbeda sama-sama sukses.
- ADR 0059 mendefinisikan `paid_late` dan original-slot reacquisition, tetapi untuk package tidak menjelaskan apakah/kapan PackagePurchase, SessionEntitlement, dan PackageValidity dibuat bila slot pertama tidak dapat direacquire.
- Efek `full_refund` terhadap PackagePurchase yang sudah sebagian terpakai, future Appointment, dan remaining SessionEntitlement tidak ditentukan.
- Persist verified PaymentEvent dan semua internal effects belum dinyatakan sebagai satu atomic/idempotent application transaction.

**Required correction**

Pisahkan `Payment` current projection dari append-only `PaymentEvent`; modelkan RefundAction/attempt/event secara eksplisit; tetapkan uniqueness/idempotency per provider event, payment intent, dan refund command; verifikasi amount/currency/order/merchant; definisikan `paid_late` package creation serta package-close/cancel effects; dan pastikan verified event + state transitions + outbox/audit committed secara atomik.

### P1-11 — Append-only audit belum selaras dengan data minimization dan redaction

**Evidence**

- Guide mengizinkan audit menyimpan before/after state dan reason (`IMPLEMENTATION-GUIDE.md:486–495`). Tanpa payload allowlist, ini dapat menyalin contact data atau narrative yang seharusnya tidak masuk sistem.
- Seluruh entity classification fields PRD Teknis masih kosong (`teknis-embedded.json:61–99`).
- Belum dijelaskan bagaimana redaction/retention berlaku ke AuditEvent, DeliveryAttempt, application logs, dan backup sambil menjaga append-only integrity.
- Dua bootstrap Admin dapat mengelola/revoke staff, tetapi tidak ada explicit last-active-Admin guard atau tested recovery invariant.

**Required correction**

Buat per-field data inventory dan audit payload allowlist; simpan stable identifier/hash/reason code daripada full state bila tidak perlu; definisikan redaction tombstone/metadata untuk append-only record, log/backup handling, dan last-Admin/recovery invariant sebelum Slice 5/8.

### P1-12 — No-show pada menit ke-15 bertentangan dengan istilah “post-session outcome” — **CLOSED by `ADR 0092-appointment-outcome-timing.md`**

**Evidence (historical)**

- ADR 0015 menyebut `completed`/`no_show` sebagai post-session outcomes dan hanya boleh ditandai oleh actor berwenang (`0015-appointment-outcomes.md:13–20`).
- ADR 0028 mengizinkan `no_show` 15 menit setelah scheduled start dan langsung mengonsumsi entitlement (`0028-no-show-grace-period.md:11–15`).
- Session launch berlangsung 60 menit, sehingga status terminal/consumption dapat terjadi saat masih tersisa 45 menit; late-arrival dan correction window masih open (`ADR 0028:33–35`).

**Required correction (resolved)**

- `ADR 0092` memilih **`no_show` sebagai early operational checkpoint** (T+15m, locked) dan outcome final tetap di end-of-session dengan enum 5 nilai: `completed` | `completed_partial` | `no_show` | `no_show_late` | `cancelled`. Late-arrival tetap diterima; klien datang setelah T+15m tetap dilayani dengan outcome `no_show_late` (entitlement tetap consumed karena slot sudah reserved). Correction window **7×24 jam** Asia/Jakarta untuk Admin via `OutcomeCorrection`. Entitlement coupling: `completed`/`completed_partial`/`no_show`/`no_show_late` semua consume; `cancelled` tidak consume. Notifications eksplisit (`no_show_recorded`, `outcome_finalized`, `outcome_corrected`, dll). `IMPLEMENTATION-GUIDE.md §6.1.1–§6.1.4` dan §6.2, `DOMAIN-MODEL.md` Lifecycle section, dan `TBC-NO-SHOW-01` di register semuanya di-patch.

### P1-13 — Package-wide cancellation dan race dengan Appointment outcome belum punya matrix

**Evidence**

- ADR 0024 menyatakan package cancellation/entitlement accounting masih open (`0024-admin-cancellation-review.md:13–15,33–35`).
- Refund package adalah purchase-level full/no-refund, sedangkan entitlement state tetap operational (`0063-package-refund-at-purchase-level.md:11–15`).
- Belum ditentukan apakah package-wide approval menutup semua future Appointment dan unused entitlement secara atomic.
- CancellationRequest yang pending membiarkan Appointment aktif, sehingga dapat beradu dengan `completed`/`no_show` sebelum keputusan Admin.

**Status (2026-08-31)**: **CLOSED by `ADR 0095-package-cancellation-matrix.md`**.

- Target types: `appointment`, `booking`, `package_purchase` (no direct `session_entitlement` target).
- At-most-one open `CancellationRequest` per target enforced by unique partial index.
- Pending-vs-outcome race resolved deterministically: R1 (completed first) / R2 (no_show first) → request `auto_resolved` with reason code; R3 (approval first) → late outcome marking rejected by trigger; R4 (reschedule first) → request rebinds to replacement Appointment.
- Atomic per-target effects in single transaction: target=appointment/booking → Appointment `cancelled` + `CapacityReservation` `cancelled` (`release_reason = appointment_cancelled`) + linked `SessionEntitlement` restored if valid else closed; target=`package_purchase` → all future non-terminal Appointments + their `CapacityReservation` rows + unused `SessionEntitlement` (split `closed_restored_by_cancellation` vs `closed_cancelled_with_package`) + `PackagePurchase → closed_by_cancellation` (terminal, no re-open) + `PackageValidity.valid_until` unchanged + consumed/expired untouched.
- Partial-package 1-of-N uses target=appointment path (PackagePurchase stays `partially_consumed`).
- Repeat/correction = new `CancellationRequest` with `correction_of` linkage; original immutable history; new decision applies §3 idempotently.
- `RescheduleAction` transition table enumerated (§5): forbidden transitions (`completed`/`no_show`/`no_show_late`/`completed_partial`/`cancelled`/`rescheduled`/before-payment) + couple-package rules via `BookingParticipant`.
- Couple-package target resolution (§6): individual A/B cancellation vs joint pre-start vs package-wide; mid-session withdrawal is **not** a cancellation path.
- Migration schema (D1/SQLite + Postgres equivalent) with triggers and unique partial index in `ADR 0095 §8–§9`.
- 15 acceptance criteria tests including the ticket-mandated package-wide integration test (closing 3 future appointments + restore entitlement + atomic effects).
- Refund remains `full_refund`/`no_refund` only per `ADR 0063`/`0077`; this ADR adds no refund semantics.

---

## P2 — cleanup dan usability

1. `IMPLEMENTATION-GUIDE.md:306` memiliki typo `den y:`.
2. Technical synthetic summary memiliki typo `issue/refconcile RefundAction` (`teknis-embedded.json:177`).
3. Non-Teknis `biz_story` masih mengatakan status empat program “harus diputuskan”, padahal ADR 0070/guide sudah memutuskan hanya SERAYA PULANG bookable.
4. Technical PRD masih memiliki target launch date tetapi milestones dan production checklist kosong; date perlu diberi status current/TBC/obsolete, bukan dibiarkan tampak authoritative.
5. Fixed-repeat Psychologist 2–5 semuanya required walaupun hanya satu launch psychologist; form harus conditional atau slot tambahan ditandai N/A.
6. Technical form hanya menyediakan 13 repeated entity slots, sementara guide menyebut sekitar 30 entities; form schema tidak cocok dengan domain baseline.
7. Lima TBC hanya muncul di register tanpa inline pointer dari section terkait (`TBC-CONSENT-01`, `TBC-LIVE-PRD-01`, `TBC-POLICY-01`, `TBC-REC-01`, `TBC-SCHEDULE-01`).
8. Business KPI fields kosong bukan blocker coding; jika tim memang tidak menggunakan target tersebut, ubah menjadi optional/N/A daripada memaksa metric spekulatif.
9. Urutan slice memiliki dependency terbalik: Client OTP ada di Slice 5 sebelum email seam Slice 7; payment success Slice 3 memiliki package side effects yang baru muncul di Slice 4; privileged workflows muncul sebelum auth primitives lengkap.
10. Foundation belum menyebut fake/seam untuk identity provider, email, scheduler, ID generator, unit-of-work, transactional outbox, dan fault injection.

---

# Cross-document decision matrix

| Concern | PRD | Guide/domain/ADR | Review status | Correction |
|---|---|---|---|---|
| Launch program scope | Non-Teknis story stale; launch gate clear | ADR 0070/guide clear | Confirmed with stale copy | Backfill story/launch fields |
| Catalog/pricing | Mostly recorded | Guide/domain model clear | Confirmed | Structured couple offering fields |
| Product stack | Supabase + Docker | Worker + D1 | **Conflict** | Architecture ADR |
| Booking/Appointment split | Hidden summaries, FR blank | Concept clear; combined state flow | Partial | Separate transition tables |
| Availability | Rules summarized | Exact overlap/buffer open | **Blocked for implementation** | Capacity/buffer ADR/TBC |
| Guest intake/eligibility | Mostly blank | Only high-level data boundary | **Blocked for booking UI** | Intake/minor/eligibility TBC |
| Payment truth | Clear | Clear | Confirmed seam | Resolve expiry/TTL/provider evidence |
| Couple package | Catalog confirmed | Participant model absent | **Blocked** | Couple participant/consent model |
| Package validity | No business value | Calendar model decided; exact value open | Partial | Narrow TBC + decide values |
| Cancellation/refund | Non-Teknis summary clear | Context/old ADR stale | Conflict in source text | Patch glossary/statuses |
| WhatsApp | Non-Teknis mostly optional | Context/ADR 0064 conflict | Conflict in source text | Make optional everywhere current-state |
| Staff roles/auth | Summary clear | Guide clear; session policy open | Partial | Staff-session TBC/security baseline |
| Privacy/retention | Strategy clear; exact copy/docs blank | Direction clear | Partial/production gate | Field map, trigger, policy evidence |
| Public content/CMS | Largely blank | Module/command incomplete | Not frontend-ready | Content/crisis/a11y/SEO handoff |
| Operations | Blank | Generic gates | Not production-ready | Environments, backup, observability, runbooks |

---

# TBC audit

## TBC yang sudah baik

Guide memiliki 12 stable IDs dan seluruh ID yang muncul tercatat di register:

- ACCESS;
- ADMIN;
- API;
- CONSENT;
- LIVE-PRD;
- NOTIFY;
- PACKAGE;
- PAY;
- POLICY;
- PRIVACY;
- RECONCILIATION;
- SCHEDULE.

## TBC yang hilang atau perlu dipecah

1. `TBC-STACK-01`
2. `TBC-COUPLE-01`
3. `TBC-INTAKE-01`
4. `TBC-MINOR-01`
5. `TBC-ELIGIBILITY-01`
6. `TBC-BOOKING-CUTOFF-01`
7. `TBC-CAPACITY-01`
8. `TBC-BUFFER-01`
9. `TBC-PAY-EXPIRY-01`
10. `TBC-STAFF-SESSION-01`
11. `TBC-DELIVERY-MODE-01` — online meeting mechanism/offline venue/instructions
12. `TBC-CONTENT-01`
13. `TBC-RESCHEDULE-01` — allowed lifecycle states/cutoff/repeat handling — **CLOSED by `ADR 0095-package-cancellation-matrix.md §5`**: RescheduleAction forbidden transitions enumerated (only from `scheduled`/`confirmed`; rejected after `completed`/`no_show_late`/`completed_partial`/`no_show`/`cancelled`/`rescheduled`/already-`rescheduled`/before-payment); replacement capacity overlap enforced via `ADR 0091` `CapacityReservation`; couple-package rules via `BookingParticipant` (`ADR 0090`); cancellation-request rebound (R4) to replacement Appointment; migration schema in `ADR 0095 §8` (trigger blocking late outcome marking). Acceptance criteria tests 10, 11, 12 di `ADR 0095 §7`.
14. `TBC-PAY-SETTLEMENT-01` — **Closed by Round 5 (`ADR 0093-payment-settlement-uniqueness.md`)**: at-most-one successful settlement per `Booking.id` ditegakkan oleh unique partial index `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` plus application-level precheck (defense-in-depth, same pattern as `ADR 0091` capacity overlap). Amount/currency/order/merchant value match wajib selain signature. Idempotency keys (`payment_event_idempotency` keyed by `(provider_event_id, payment_intent_id)`) lifetime-scoped dengan `payload_hash` fingerprint; same-key/different-payload → typed failure `idempotency_key_collision` (rollback, tidak diam-diam overwrite). Out-of-order/repeated-status/reversal mapping table ada di `ADR 0093 §4.1`; `refund`/`chargeback` adalah no-op pada `Payment` (refund melalui `RefundAction` terpisah). Crash window tiga-lapis: (a) createCheckout → persistence (optimistic `Payment status=pending` + idempotency); (b) verified webhook → state transition (webhook handler transaction membungkus idempotency + `PaymentEvent` + value match + state transition + outbox); (c) transition → outbox delivery (transactional outbox dengan retry + dead-letter). Verified event + state transition + outbox harus atomic. `paid_late` package creation: `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` dibuat **tepat saat webhook verified** (Option A), bukan ditunda. Jika slot reacquire berhasil → `paid_late_slot_reacquired` + `SessionEntitlement #1.state = 'scheduled'`. Jika reacquire gagal → `paid_late_first_session_pending` + `SessionEntitlement #1.state = 'pending_schedule'` + `PackagePurchase.requires_first_session_scheduling = true`; Admin resolve via existing reconciliation flow (`ADR 0067`). SQL migration (Postgres + D1/SQLite equivalent) di `ADR 0093 §6–§7`. Acceptance criteria #1 dan #2 (duplicate webhook dan paid-late package integration test) didefinisikan eksplisit di `IMPLEMENTATION-GUIDE.md §7.6–§7.7`.
15. `TBC-NO-SHOW-01` — early checkpoint versus terminal outcome/late-arrival correction — **CLOSED by `ADR 0092-appointment-outcome-timing.md`** (model final: early checkpoint `no_show` di T+15m, late-arrival tetap diterima dengan outcome `completed_partial`/`no_show_late`, correction window 7 hari kalender, entitlement coupling deterministic).
16. `TBC-PACKAGE-CANCEL-01` — package-wide cancellation dan pending-versus-outcome race — **CLOSED by `ADR 0095-package-cancellation-matrix.md`** (matrix lengkap untuk Booking/Appointment/PackagePurchase/SessionEntitlement: target types = appointment/booking/package_purchase; at-most-one open CancellationRequest invariant via unique partial index; pending-vs-outcome race R1 (completed first) / R2 (no_show first) auto-resolve dengan reason_code; R3 approval-blocks-late-outcome-marking via trigger; R4 reschedule rebinds CancellationRequest to replacement Appointment; atomic per-target effects: target=appointment/booking → Appointment `cancelled` + CapacityReservation `cancelled` + linked SessionEntitlement restored if valid else closed; target=package_purchase → single transaction menutup semua future non-terminal Appointments + closes all CapacityReservations + unused entitlements dengan `valid_until >= now` → `closed_restored_by_cancellation` (others → `closed_cancelled_with_package`) + PackagePurchase → `closed_by_cancellation` terminal no-reopen + PackageValidity.valid_until unchanged; consumed/expired entitlements untouched; refund terpisah di `RefundAction` `full_refund`/`no_refund` only per `ADR 0063`/`0077`; partial-package 1-of-N melalui target=appointment tetap meninggalkan PackagePurchase `partially_consumed`; repeat/correction = new CancellationRequest dengan `correction_of` linkage, original immutable history, new decision applies §3 effects afresh idempotently; RescheduleAction matrix §5 dengan forbidden transitions enumerated dan couple-package rules §6 via `BookingParticipant` `ADR 0090`). Acceptance test 14 integration test "package-wide cancellation closing 3 future appointments + restore entitlement + atomic effects" didefinisikan eksplisit di `ADR 0095 §7.5`; trigger migrations D1/SQLite + Postgres equivalent di `ADR 0095 §8–§9`.
17. `TBC-CANCELLATION-PUBLIC-01` — public-website copy untuk cancellation/refund WhatsApp routing (resolved 2026-08-31: copy short-statement "handled by Admin via WhatsApp; case-by-case"; tidak ada UI)

Setiap row harus menyebut owner, blocking stage (`before slice`, `before UAT`, atau `production only`), default behavior yang aman, dan acceptance evidence.

---

# Readiness per implementation slice

| Slice | Verdict | Yang boleh dilakukan sekarang | Yang memblokir |
|---|---|---|---|
| 0 — Foundation | **Partial** | vocabulary, typed errors, fake clock, fixtures, idempotency/correlation primitives | architecture/database ADR dan aggregate ownership sebelum schema/migrations |
| 1 — Catalog/availability | **Partial** | catalog types, pricing snapshot model, public shell | capacity concurrency, buffer placement, real schedule/location, content |
| 2 — Guest booking/hold | **Blocked** | spike/prototype only | intake, minor/eligibility, cutoff, participant model, atomic hold mechanism |
| 3 — Payment adapter | **Partial** | provider-neutral interface + fake adapter | expiry/hold invariant, exact Midtrans evidence, retry/reconciliation |
| 4 — Package | **Blocked for full scope** | individual package model after aggregates clear | validity values/boundary, couple participant model, exception policy |
| 5 — Staff/ClientAccess | **Partial** | membership vocabulary and authorization tests | OAuth/session/re-auth/revocation/recovery detail |
| 6 — Cancellation/refund | **Partial** | pure domain transition tests after state tables | transaction strategy, repeat/correction rules, provider reconciliation |
| 7 — Notifications | **Partial** | event intents and fake adapter | provider/copy/bounce/quiet-hours/package offsets |
| 8 — Privacy/retention | **Partial** | policy schema and dry-run design | exact field map/trigger/evidence; no destructive production action |
| 9 — CMS/UAT | **Not ready** | none beyond UI spike | content, admin field matrix, crisis/legal copy, security/ops baseline |

---

# Recommended correction order

1. **Freeze and reconcile canonical sources**
   - compare technical revisions 168 and 170;
   - choose canonical values intentionally;
   - prevent schema-external canonical keys from disappearing.
2. **Decide architecture/persistence**
   - runtime, DB, transaction/concurrency, migrations, backup/restore.
3. **Close four domain blockers**
   - aggregate/state tables;
   - couple participant/consent/access;
   - booking intake/minor/eligibility/cutoff;
   - capacity overlap/buffer.
4. **Resolve payment TTL semantics**
   - provider expiry versus SlotHold, then late-payment UX/runbook.
5. **Patch stale current-state documentation**
   - `CONTEXT.md`, ADR statuses/open follow-ups, authority matrix.
6. **Backfill both PRDs**
   - confirmed answer, explicit `TBC-*`, `DEFERRED`, atau `N/A`; jangan biarkan required field kosong.
7. **Revise Implementation Guide**
   - conditional status;
   - complete TBC register;
   - separate state machines;
   - aggregate ownership;
   - Content/Crisis/security/operations coverage.
8. **Run second review**
   - trace requirement → command → state/invariant → acceptance test → production gate.

## Final recommendation (Round 1)

Jangan mulai feature coding end-to-end dari guide versi sekarang. Mulai hanya pekerjaan foundation yang technology-neutral. Setelah P0-01 sampai P0-04 selesai, guide dapat dinaikkan kembali menjadi implementation baseline dan slice-by-slice coding dapat dimulai tanpa developer mengarang keputusan bisnis.

Lihat sub-bagian **Round 2: v0.1 docs and 2026-08-31 JSON** untuk status konflik terkini setelah review bisnis.

---

# Round 2: v0.1 docs and 2026-08-31 JSON

Round 2 menambahkan empat sumber:

1. **PRODUCT-CHARTER-v0.1.md** (business outcome, scope discipline, 7 keputusan pra-prototype).
2. **SERVICE-POLICY-MATRIX-v0.1.md** (operating model, katalog 8 offer, eligibility, journeys, comms, release gates).
3. **INFORMATION-ARCHITECTURE-v0.1.md** (IA + 11 surface, 3 booking flow prototype, copy guardrails).
4. **`seraya-psikologi-nonteknis-2026-08-31.json`** (export 2026-08-31; 143 key, jawaban psikolog, draft booking_policy/consent penuh).

Sumber baseline Round 1 tidak berubah.

## Yang sudah ter-resolved (Round 1 → Round 2)

| Round 1 finding | Round 2 status |
|---|---|
| P0-04 booking intake/minor/eligibility/cutoff kosong | **Resolved sebagian**: usia 18–40 untuk direct self-service (`PRODUCT-CHARTER-v0.1` confirmed foundation; `aud_age=[18-24,25-34]`), 16–17 butuh guardian-consent terpisah, minor/guardian policy ada di JSON (`booking_minor`), eligibility dan out-of-scope tercatat (`aud_exclusion`). Cutoff `1 jam sebelum` dan hold `15 menit` masih bertentangan dengan guide (`10 menit`). |
| P1-04 CONTEXT/ADR stale soal WhatsApp | **Resolved di Matrix**: WhatsApp adalah opsional manual support, bukan workflow/source of truth (`SERVICE-POLICY-MATRIX-v0.1 §6`). JSON `channels=[email,wa,calendar]` masih ambigu karena wa ditampilkan sebagai channel biasa; perlu dipilah jadi optional manual support, bukan lifecycle channel. |
| P1-06 tidak ada copy guardrails untuk public site | **Resolved di IA**: lead with client situation, jangan janjikan diagnosis/emergency/cure/availability palsu, tidak publish testimonial/credential tanpa bukti, usia 16–17 tampilkan guardian route (`INFORMATION-ARCHITECTURE-v0.1 §6`). |
| P1-06 FAQ/biz_story kosong | **Resolved**: `biz_story` panjang di JSON, `brand_words` hadir, copy positioning dan USP tercatat. Yang masih kosong: `hero_copy`, `primary_cta`, `proof_claims`, `testimonials`, `faq`, `content_topics`, `landing_sections`, `psychologist_1_photo`. |
| Missing `crisis` | **Resolved**: `crisis` di JSON menjelaskan non-emergency boundary dengan jelas. `referrals` masih kosong. |
| Missing `consents` | **Resolved**: `consents` di JSON berisi informed consent 8-section lengkap (tujuan, sukarela, kerahasiaan, data, batasan, daring, darurat, persetujuan). |
| Missing `approvals` | **Resolved**: `approvals` di JSON satu Admin boleh cancellation+refund terpisah, Editor deferred, Google SSO, two-Admin bootstrap. Cocok dengan ADR 0078/0079/0080/0081. |
| Missing `retention` | **Resolved**: `retention` di JSON match dengan ADR 0083 dan ADR 0086: 12 bulan setelah last active service, audit/legal per category, ConsentRecord follow service, audit/security per policy. |
| Stack PRD Teknis (Supabase+Docker) vs Guide (Worker+D1) | **Tidak berubah** — Round 2 tidak menyentuh keputusan stack. Tetap konflik sampai architecture ADR. |
| Couple participant model (P0-03) | **Tidak berubah** — Matrix bahkan secara eksplisit menulis keputusan participant/consent untuk couple wajib selesai sebelum live bookable (`SERVICE-POLICY-MATRIX-v0.1 §4C TBC`). |
| Capacity overlap/buffer (P1-02) | **Tidak berubah**. |
| No-show timing/early terminal (P1-12) | **Tidak berubah** — Matrix tidak membahas. |
| Payment/refund settlement uniqueness (P1-10) | **Tidak berubah** — Matrix menyatakan partial refund deferred, full/no-refund only (cocok dengan ADR 0077), tetapi tidak bicara tentang at-most-one settlement atau `paid_late` package creation. |

## Konflik baru atau yang memburuk di Round 2

### R2-01 — JSON `booking_policy` mementahkan ADR 0077 dan ADR 0076

**Evidence**

- JSON `booking_policy §C` mendefinisikan refund bertingkat: `>3 hari → 90%`, `3–1 hari → 80%`, hari H → `no refund`. Lalu menyebut `refund 15%` untuk reschedule, `refund 50%` untuk reschedule >1 kali, dan `refund 50%` untuk reschedule pasca cancel.
- ADR 0077 line 15–23: `RefundAction` vocabulary untuk launch adalah `full_refund` atau `no_refund`; partial monetary refunds out of scope.
- ADR 0076 line 13–23: tidak ada automatic cancellation cutoff; setiap kasus direview Admin; refund tidak pernah diturunkan dari timing/approval.
- JSON §B menentukan `late ≤30 menit masih ditoleransi`, `>30 menit tanpa kabar = no-show non-refund`. Guide/ADR 0028 hanya menyebut no-show grace 15 menit.
- JSON §E menyebut `refund ≤7 hari kerja`, mengembalikan via `metode pembayaran Seraya atau rekening klien`, dan biaya admin/transfer pihak ketiga dapat dibebankan ke klien.

**Why this blocks**

- Implementer tidak boleh membuat tiga kelas refund parsial + biaya admin + transfer ke rekening klien karena ADR 0077 sudah memilih `full_refund`/`no_refund` saja.
- `no-show >30 menit` dan refund bertingkat akan otomatis memberikan keputusan finansial dari timing, padahal ADR 0076 line 19 melarang hal itu.
- Biaya admin/transfer dibebankan ke klien adalah partial refund yang berbeda nama.

**Required correction**

Tetapkan policy ini ke salah satu dari dua mode:

- **Mode A (cocok dengan ADR 0077)**: json `booking_policy` adalah draft copy publik yang akan direkonsiliasi; document eksplisit mengakui launch tidak membedakan 90/80/no-refund otomatis; Admin review case-by-case; refund selalu `full_refund` atau `no_refund`; biaya admin/transfer jadi biaya internal Seraya, bukan debit klien.
- **Mode B (cocok dengan json)**: ajukan ADR baru yang mencabut ADR 0077 dan mengubah ADR 0076 untuk mengizinkan partial refund otomatis bertingkat. Ini menyentuh PRD Non-Teknis launch claim dan tidak boleh dilakukan sebelum implementasi siap.

Sampai keputusan ini, **booking_policy di JSON tidak boleh dianggap launch copy**, dan tidak boleh dipakai sebagai source code copy di website.

### R2-02 — `booking_hold` 15 menit di JSON vs 10 menit di guide

**Evidence**

- JSON `booking_hold = "15 menit"`.
- Guide line 271: SlotHold default TTL `10 menit`.

**Required correction**

Pilih satu; default aman adalah tetap `10 menit` (guide) karena sudah diacu di seluruh invariant. Update JSON atau document sebagai `TBC-PAY-01` yang menjelaskan exact provider expiry alignment.

### R2-03 — `pay_methods` JSON termasuk `wallet`

**Evidence**

- JSON `pay_methods = ["qris","va","wallet"]`.
- Guide line 91 + line 363: launch payment categories hanya QRIS dan bank transfer/Virtual Account; e-wallet dan payment method lain deferred.

**Required correction**

Hapus `wallet` dari JSON atau beri label `DEFERRED`; biarkan launch checkout hanya menampilkan QRIS dan VA. Adapter Midtrans tetap menyembunyikan method lain di Snap UI.

### R2-04 — `booking_intake` terlalu minim untuk beberapa flow

**Evidence**

- JSON `booking_intake = "Nama \nNO HP"`.
- Guide line 40-46 menentukan booking minimum operational data termasuk verified email/phone, contact, mode, snapshot; ConsentRecord.
- Tidak ada field email eksplisit.

**Required correction**

Tambahkan minimal `Nama lengkap, Email (wajib, untuk ClientAccess/notification), Nomor telepon (opsional WA support), Consent version`. Tetapkan sebagai `TBC-INTAKE-01` jika perlu.

### R2-05 — `booking_access` di JSON diset `account`, guide menyebut guest primary

**Evidence**

- JSON `booking_access = "account"`.
- Guide line 119–128: guest ClientAccess via email magic link/OTP, opsional UserAccount/Google linking.
- Charter line 35: `Checkout preference: Choose a schedule and pay directly`.

**Required correction**

Klarifikasi: guest checkout dengan ClientAccess adalah default. `account` di JSON bukan UserAccount penuh melainkan ClientAccess scoped. Update JSON atau rename field; default produk tetap guest-primary dengan optional linking.

### R2-06 — `channels` JSON menampilkan WhatsApp sejajar dengan email/calendar

**Evidence**

- JSON `channels = ["email","wa","calendar"]`.
- ADR 0066 line 13–18: WhatsApp opsional manual support, tidak boleh menjadi lifecycle channel atau source of truth.

**Required correction**

Representasikan field `channels` sebagai: `["email (auto)", "wa (optional manual support, bukan lifecycle)", "calendar (admin-only visibility)"]` atau rename ke `automated_channels` dan `support_channels` terpisah.

### R2-07 — Couple booking diartikan day-one bookable di Charter dan IA, tetapi Matrix menunda sampai keputusan participant

**Evidence**

- Charter line 35: couple counselling adalah day-one offer; Matrix line 30: `Couple counselling package | Online | 3 × 60 minutes | Rp350.000 | Bookable (dengan sequence A, B, joint)`; IA line 67–70: couple flow siap di-prototype.
- Matrix §4C TBC: participant identity fields, consent wording, who can schedule/change, reminder recipient, withdrawal — semua ini **required sebelum couple live bookable**, walau catalog boleh ditampilkan.
- Charter §6 keputusan #4 eksplisit bertanya apakah couple harus day-one bookable atau hanya ditampilkan.

**Required correction**

Pilih salah satu:

- **Couple launch-deferred**: catalog tampil dengan badge `coming soon`, tidak ada checkout. PRD Non-Teknis `packages` dan JSON `packages` dibiarkan kosong atau sebagai placeholder.
- **Couple launch-ready**: selesaikan participant/consent model dulu, dengan biaya tidak kurang dari 1–2 sprint.

Rekomendasi: **defer** sampai participant model fix.

### R2-08 — `psychologist_2/3/4` profile terisi padahal hanya Fuja launch

**Evidence**

- JSON terisi untuk psychologist 1–4 dengan license, expertise, education, dan sebagian bio. Psychologist 5 kosong.
- Charter line 17: hanya Fuja launch; Matrix line 7: bookable psychologist Fuja only.
- ADR 0075 line 7–9: `other planned profile slots have no confirmed data`.

**Required correction**

Untuk launch, hanya profile Fuja yang dipakai di website. Profile 2–4 harus berstatus `not_published` atau dihapus dari export publik. License yang dimasukkan ke JSON adalah data sensitif dan `[REDACTED]` untuk shared artifact — saat ini sudah di-redact untuk psychologist_1, tetapi psychologist_2/3/4 menyimpan license asli. **Pertimbangkan juga: hapus/reduct data psychologist_2/3/4 atau pindahkan ke private artifact**.

### R2-09 — `persona_1/2/3 trigger` persis sama dengan `goal`

**Evidence**

- JSON `persona_1_goal == persona_1_trigger` (sama persis, 27 karakter).
- JSON `persona_2_goal == persona_2_trigger` (21 karakter).
- JSON `persona_3_goal == persona_3_trigger` (23 karakter).

**Required correction**

`trigger` adalah konteks/momen (`kapan klien mulai mencari`), `goal` adalah tujuan yang diharapkan. Saat ini dua field identik dan tidak memberikan informasi tambahan. Isi field `trigger` dengan situasi konkret (misal `baru mulai magang`, `setelah melahirkan`), bukan copy dari goal. Ini mengganggu copy IA/landing yang seharusnya menampilkan client-situation-first.

### R2-10 — JSON `biz_story` menyebutkan `kami berlima` padahal IA §2/§6 dan Matrix tidak menyebut struktur tim

**Evidence**

- JSON `biz_story` paragraf pembuka: `SERAYA berawal dari sebuah pertemanan. Kami berlima dipertemukan...`. Lalu menyebut `kami pun bukan lima orang yang datang tanpa cerita`.
- Charter line 11: `Locations: Malang (four psychologists) and Mataram (one psychologist)` — total lima psikolog.
- Matrix/Guide tidak menyebutkan narasi `kami berlima`.

**Required correction**

`biz_story` adalah brand origin story dan tidak bertentangan secara substansial, tetapi framing `kami berlima` sebaiknya konsisten dengan jumlah psikolog aktual dan persona publik. Saat ini tulisannya menyebut `lima psikolog` sementara launch hanya Fuja bookable — pertimbangkan apakah story ini kompatibel dengan copy `For ages 18–40`, `Fuja is the only confirmed launch psychologist`.

### R2-11 — `pricing/charter` tidak memasukkan `Couple` fee selaras dengan couple launch-deferred recommendation

**Evidence**

- Matrix line 27–30 mencantumkan harga couple online Rp350.000 dan offline Rp550.000.
- Charter §6 keputusan #4 menanyakan apakah couple day-one bookable.

**Required correction**

Harga couple boleh tetap dicatat sebagai reference copy/catalog fixture untuk prototype/wireframe, tetapi harus ditandai `reference; not purchasable until couple participant model is resolved`.

### R2-12 — `biz_location = "Online/09.00-19.00"` menyiratkan fixed schedule, padahal ADR 0075 menetapkan schedule production terpisah

**Evidence**

- JSON `biz_location = "Online/09.00-19.00"`.
- ADR 0075 line 26, ADR 0088 line 17: `anytime/anyplace` adalah placeholder non-blocking untuk PRD/design, harus diganti sebelum live slots publication.
- Belum ada konfirmasi production recurring schedule.

**Required correction**

`biz_location` saat ini bisa ditampilkan di copy public sebagai placeholder fixture design-only, tetapi jangan tampilkan slot production sampai Fuja recurring schedule confirmed. Tetapkan sebagai `TBC-SCHEDULE-01` blocker.

### R2-13 — `launch_gate` di JSON masih high-level

**Evidence**

- JSON `launch_gate` paragraf: launch menampilkan 4 program, hanya SERAYA PULANG yang bookable/paid.
- Matrix §7 release gates menyebut 6 gate eksplisit: profile evidence, real availability, consent/privacy/crisis policy, verified payment integration, ops owner, couple-participant jika bookable.
- Charter §6 keputusan #4–#6 masih open.

**Required correction**

Gunakan **Matrix §7** sebagai launch gate yang executable; `launch_gate` JSON terlalu ringkas. Buat checklist owner-by-owner di implementation guide dan turunkan ke `TBC-*` register.

## Status TBC Round 1 → Round 2

| TBC | Status Round 2 |
|---|---|
| `TBC-INTAKE-01` | **Diperbarui**: usia 18–40 confirmed, 16–17 guardian route, field intake minimum (`Nama, Email, Nomor HP`) **belum final** di JSON. |
| `TBC-MINOR-01` | **Diperbarui**: booking_minor JSON sudah punya teks guardian consent. Belum punya field operational implementation. |
| `TBC-ELIGIBILITY-01` | **Diperbarui**: aud_needs dan aud_exclusion sudah final di JSON; crisis referral text sudah ada; `referrals` masih kosong. |
| `TBC-BOOKING-CUTOFF-01` | **Terbuka**: `1 jam` di JSON vs `10 menit` hold di guide vs `60 menit` sesi. |
| `TBC-PAY-01` | **Konflik baru** dari R2-03 (`wallet`), R2-02 (hold 15 vs 10). |
| `TBC-COUPLE-01` | **Diperbarui**: Matrix §4C eksplisit participant/consent/notification/withdrawal decisions required sebelum couple live bookable. |
| `TBC-POLICY-01` | **Closed by Round 3**: launch refund policy = `full_refund`/`no_refund` only; tiered amounts live in Admin WhatsApp log; no public cancellation/refund UI. |
| `TBC-NOTIFY-01` | **Diperbarui**: reminders `24 jam & 2 jam` di JSON cocok dengan ADR 0052; copy confirmation template masih placeholder. |
| `TBC-REC-01` | Tetap terbuka. |
| `TBC-PRIVACY-01` | **Diperbarui**: retention text di JSON sudah match ADR 0083/0086, consents panjang di JSON, crisis text ada. Implementasi field map tetap TBC. |
| `TBC-ACCESS-01` | Tetap terbuka. |
| `TBC-ADMIN-01` | Tetap terbuka. |
| `TBC-API-01` | Tetap terbuka. |
| `TBC-SCHEDULE-01` | **Konflik baru** dari R2-12. |
| `TBC-CONSENT-01` | **Resolved sebagian**: consent JSON lengkap, tetapi `TBC-CONSENT-01` masih perlu sign-off sebelum production publish. |
| `TBC-LIVE-PRD-01` | Tetap terbuka. |

## TBC baru dari Round 2

1. `TBC-POLICY-RECONCILE-01` — **Closed by Round 3** (Mode A selected): full/no-refund only; admin WhatsApp; no public UI. PRD Non-Teknis `booking_policy` text becomes admin-conversation reference, not implementation source.
2. `TBC-CHANNELS-MODEL-01` — representasi `channels` JSON vs ADR 0066 opsional manual support boundary (R2-06).
3. `TBC-COUPLE-LAUNCH-01` — putuskan couple launch-deferred atau launch-ready; saat ini dokumen bertentangan (R2-07).
4. `TBC-PERSONA-FIELDS-01` — isi ulang `persona_*_trigger` agar berbeda dari `goal` (R2-09).
5. `TBC-PROFILE-EXPORT-01` — psychologist_2/3/4 license asli bocor di export; tetapkan redaction policy untuk non-launch profiles (R2-08).
6. `TBC-STORY-VOICE-01` — biz_story framing `kami berlima` vs only Fuja launch (R2-10).
| `TBC-LAUNCH-GATE-DETAIL-01` | **Closed by Round 7 (`ADR 0096-launch-gate-checklist.md`)** | Matrix §7 adopted as executable launch checklist; G-1..G-14 owner-by-owner (business owner + clinical/ethics + operations + finance + technical) with blocking stage (`before slice` / `before UAT` / `production only`) and concrete acceptance evidence (artifact path, URL, signed record, or test run-id). Split into PRD/design handoff checklist (§16.1) and production-launch checklist (§16.2); gate-to-TBC dependency map (§16.3); release sign-off template (§16.4). Live launch requires G-14 consolidated sign-off at `docs/launch/release-sign-off-v1.md`. Patched into `IMPLEMENTATION-GUIDE.md §16`. |

## Verdict Round 2

Foundation bisnis sudah **jauh lebih kuat**: usia 18–40, Fuja confirmed launch, full/no-refund only, Editor deferred, Google SSO, two-Admin, WhatsApp optional manual support, crisis boundary, 12-month retention, consent 8-section sudah align dengan ADR-ADR kunci.

Round 2 **memperkenalkan 13 konflik baru** yang sebagian berat: booking_policy partial refund bertingkat vs ADR 0077, couple day-one claim vs Matrix deferral, hold 15 vs 10, payment wallet vs DEFERRED, profile 2–4 bocor license.

Round 2 **tidak menyelesaikan** blocker arsitektur (stack Worker+D1 vs Supabase+Docker), couple participant model, capacity overlap, no-show timing, settlement uniqueness, atau PackagePurchase `paid_late`.

Round 2 **memperkuat** rekomendasi Round 1: belum implementation-ready end-to-end; PRD/design handoff boleh dengan catatan; production launch tetap gated.

## Rekomendasi prioritas gabungan (Round 1 + Round 2)

1. **Putuskan R2-01** (partial refund bertingkat vs ADR 0077) sebelum Slice 6. Mode A atau B.
2. **Selesaikan R2-07** (couple launch-deferred atau launch-ready) sebelum implementasi couple slice.
3. **Rekonsiliasi R2-02 dan R2-03** (hold TTL, payment methods) — cukup edit JSON untuk kembali ke baseline guide.
4. **Redact psychologist_2/3/4 license** (R2-08) sebelum export shared artifact apa pun.
5. **Refactor `channels` field** (R2-06) sesuai ADR 0066.
6. **Patch CONTEXT.md dan ADR lama** (Round 1 P1-04) untuk konsistensi current-state.
7. **Architecture ADR** (Round 1 P0-01) — masih tertinggi karena menyentuh D1 migrations.
8. **Couple participant/consent model** (Round 1 P0-03) — tetap penting walau couple launch-deferred.
9. **Booking intake/minor/eligibility/cutoff final** (Round 1 P0-04) — Round 2 mengisi banyak tapi belum final.
10. **Tutup Round 1 P1-12 dan P1-13** (no-show timing, package-wide cancellation matrix).

---

# Round 3: business owner decision on non-technical conflict (2026-08-31)

The business owner has resolved the non-technical conflict between PRD Non-Teknis `booking_policy §C` (tiered partial refund, late-no-show, admin/transfer fees) and ADR 0077 + ADR 0076 (full/no-refund only, case-by-case). The resolution is Mode A:

- Booking and refund handling is **not exposed in the public website**.
- Requests come in through **Admin WhatsApp** only.
- Launch refund outcomes stay `full_refund` or `no_refund`; tiered amounts are conversation-only and never drive canonical state.
- Third-party admin/transfer fees are internal Seraya costs, never debited to the client.
- Public-website copy shows a short statement: "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case."

The owner also confirmed: when a conflict exists between non-technical/business artifacts and technical artifacts (PRD/ADR/guide/domain model) about business decisions, **the non-technical source wins**. This is now the authority rule for business scope.

## What changed in artifacts (Round 3)

- **ADR 0064** status updated to clarify cancellation/refund stays on Admin WhatsApp and is not surfaced in the public website.
- **ADR 0076** + **ADR 0077** added a "Source-of-truth clarification (2026-08-31 round)" section that documents the business-owner resolution.
- **`CONTEXT.md`** updated: WhatsApp number is **optional**, CancellationPolicy description no longer mentions partial refund, CancellationRequest/CancellationDecision/RefundAction vocabulary restricted to `full_refund`/`no_refund`.
- **`DOMAIN-MODEL.md`** updated: RefundAction description clarifies tiered amounts live in Admin WhatsApp log; notifications/support clarifies Admin WhatsApp is the public channel for cancellation/refund and the public website does not host a cancellation/refund UI.
- **`IMPLEMENTATION-GUIDE.md`** updated: §6.3 cancellation starts at "Admin WhatsApp (public channel)"; §6.4 refund adds the WhatsApp routing and the short-statement public copy; §10.2 WhatsApp boundary names Admin WhatsApp as the public channel and confirms no public cancellation/refund UI.
- **`PRD-GUIDELINE-REVIEW.md`** TBC register adds `TBC-CANCELLATION-PUBLIC-01` with the resolution baked in.

## Status update of Round 2 conflicts

| Conflict | Round 3 status |
|---|---|
| R2-01 partial refund bertingkat | **Closed**: ADR 0077 + ADR 0076 + guide now explicitly state `full_refund`/`no_refund` only; PRD Non-Teknis `booking_policy` text becomes admin-conversation reference, not launch implementation source. Public website has no cancellation/refund UI. |
| R2-02 `booking_hold` 15 vs 10 | Still open (guide default 10 menit). JSON edit recommended. |
| R2-03 `pay_methods` wallet | Still open. JSON edit recommended (`wallet` → DEFERRED). |
| R2-04 `booking_intake` minim | Still open. Recommended JSON edit (`Nama, Email wajib, Nomor HP opsional, Consent version`). |
| R2-05 `booking_access` `account` | Still open. Rename to ClientAccess-scoped; default remains guest-primary. |
| R2-06 `channels` JSON | Still open. Refactor to `automated_channels` + `support_channels`. |
| R2-07 couple day-one claim | Still open. Recommendation: defer until participant model fix. |
| R2-08 psychologist_2/3/4 license | Still open. Redact license sebelum export shared. |
| R2-09 persona trigger == goal | Still open. |
| R2-10 `biz_story` framing `kami berlima` | Still open. |
| R2-11 couple fee reference copy | Still open. Mark reference/not purchasable until participant model fix. |
| R2-12 `biz_location = Online/09.00-19.00` | Still open. |
| R2-13 `launch_gate` JSON high-level | **Closed by Round 7 (`ADR 0096-launch-gate-checklist.md`)**: Matrix §7 six gates adopted as executable checklist G-1..G-14 with named-role owner, blocking stage (`before slice` / `before UAT` / `production only`), and concrete acceptance evidence (artifact path, URL, signed record, or test run-id). Split into PRD/design handoff checklist (§16.1) vs production-launch checklist (§16.2). Gate-to-TBC dependency map (§16.3). Release sign-off template (§16.4) listing required signatures per role. Live launch requires G-14 consolidated sign-off at `docs/launch/release-sign-off-v1.md`. Patches: `IMPLEMENTATION-GUIDE.md §16`, `PRD-GUIDELINE-REVIEW.md` Round 5 register, Round 6 ticket matrix Ticket #7 row, Round 6 operational-TBC table. |

## Round 1 conflicts status update

- **P1-04** (CONTEXT/ADR stale on WhatsApp + refund): **Resolved** by CONTEXT.md + ADR 0064/0066/0076/0077 patches.
- **P1-04** (Editor status in old ADR): partial — ADR 0079 already says deferred; CONTEXT.md previously inconsistent. Re-check during UAT copy.
- **P0-04** (intake/minor/eligibility/cutoff): partially resolved by Charter and JSON, still open on cut-off `1 jam` vs guide.

## Verdict after Round 3

Foundation is more aligned with the business owner. The non-technical source now wins on business scope, and the cancellation/refund policy is officially "Admin WhatsApp, full/no-refund, no public UI."

Implementation readiness **does not move** to fully ready — remaining Round 1 blockers (architecture, couple participant model, capacity overlap, no-show timing, settlement uniqueness) still need ADR-level resolution. PRD/design handoff remains allowed with explicit placeholders; production launch remains gated.

## New top-priority items (post Round 3)

1. **Architecture ADR** (Round 1 P0-01) — touchpoint with D1 migrations.
2. **Couple participant/consent model** (Round 1 P0-03) — needed whether couple launches or not.
3. **Capacity overlap + TransitionBuffer** (Round 1 P1-02).
4. **No-show timing** (Round 1 P1-12).
5. **Settlement uniqueness + paid-late effects** (Round 1 P1-10, R2-04 hold + wallet).
6. **JSON cleanup** (R2-02 hold, R2-03 wallet, R2-04 intake, R2-05 access, R2-06 channels, R2-08 license redaction).
7. Adopt Matrix §7 launch gate as executable checklist (R2-13) — **Closed by Round 7 (`ADR 0096-launch-gate-checklist.md` + `IMPLEMENTATION-GUIDE.md §16.1–§16.4`)**.
8. **Persona trigger and biz_story framing** (R2-09, R2-10).

---

# Round 4: Ticket #6 JSON cleanup closure (2026-08-31)

Ticket #6 ("JSON cleanup for launch") sub-tasks 06.1–06.7 closed by editing `seraya-psikologi-nonteknis-2026-08-31.json` directly. The JSON now aligns with the guide/ADR baseline; the TBC register is updated accordingly. Backup of the pre-edit file is preserved at `/home/jar/.hermes/cache/documents/backups/`.

## Sub-task resolution

| Sub-task | Field | Action | Result |
|---|---|---|---|
| 06.1 | `booking_hold` | `"15 menit"` → `"10 menit"` | Matches `IMPLEMENTATION-GUIDE.md:271` |
| 06.2 | `pay_methods` | Removed `"wallet"`; added `pay_methods_deferred = ["wallet","card","otc","bnpl","direct_debit"]` | Matches `IMPLEMENTATION-GUIDE.md:91,363` |
| 06.3 | `booking_intake` | Replaced `"Nama \nNO HP"` with full minimum (Nama lengkap, Email wajib, Nomor HP opsional, Consent version) | Matches `IMPLEMENTATION-GUIDE.md:40–46` |
| 06.4 | `booking_access` | Renamed to `client_access = "guest_primary_with_optional_linking"`; original preserved under `booking_access_deprecated = "account"` for round-trip audit | Matches `IMPLEMENTATION-GUIDE.md:119–128` |
| 06.5 | `channels` | Split into `automated_channels = ["email"]` + `support_channels = ["wa (optional manual support, non-lifecycle)", "calendar (admin-only)"]`; original preserved under `channels_deprecated` | Matches ADR 0066 |
| 06.6 | `psychologist_2/3/4_license` | All three redacted to `[REDACTED — non-launch profile; verify before publication]`; `psychologist_{1..4}_publish_status` set explicitly (`published` for Fuja, `not_published` for 2–4) | Matches ADR 0075 + shared-artifact redaction policy |
| 06.7 | `profile_proof`, `landing_sections` | Labelled as TBC placeholders (`TBC-PROOF-01`, `TBC-LANDING-SECTIONS-01`) with rationale; schema-mismatch deferred to form schema owner | Does not pretend to render; preserves intent for design handoff |

## Extra fixes applied in the same pass

- **`persona_{1,2,3}_trigger`** rewritten to be distinct from corresponding `goal` (R2-09). Each trigger now describes a concrete situation/moment (baru mulai kuliah, minggu terakhir skripsi, baru menikah / anak kecil / promosi) instead of restating the goal.
- **`launch_facing_story`** added as a client-first brand narrative referencing only the launch psychologist (Fuja) — supports IA/landing copy per Ticket #8. Original `biz_story` (termasuk frasa `kami berlima`) **dipertahankan** karena dipakai IA/About page.
- **`booking_help`** updated to reference Admin WhatsApp as the public support channel.
- **`booking_policy`** prefixed with the R3 public statement: "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case." Body text preserved as admin-conversation reference, not launch implementation source.

## TBC register update

| TBC | Round 4 status | Closure evidence |
|---|---|---|
| `TBC-PAY-01` (hold TTL + wallet + pay_methods) | **Closed for hold/wallet scope** | JSON `booking_hold="10 menit"`; `pay_methods=["qris","va"]`; `pay_methods_deferred` enumerated. Exact provider expiry alignment remains open as `TBC-PAY-EXPIRY-01` (already in register). |
| `TBC-INTAKE-01` | **Closed for launch minimum fields** | JSON `booking_intake` now lists `Nama lengkap, Email (wajib), Nomor HP (opsional), Consent version`. Validation rules and exact transactional field map remain open; carried forward. |
| `TBC-CHANNELS-MODEL-01` | **Closed** | JSON now splits `automated_channels` and `support_channels` per ADR 0066 boundary; original preserved as `channels_deprecated` for round-trip traceability. |
| `TBC-PERSONA-FIELDS-01` | **Closed** | All three `persona_*_trigger` values rewritten to differ from `goal` (verified programmatically). |
| `TBC-PROFILE-EXPORT-01` | **Closed** | All non-launch psychologist licenses (`psychologist_2/3/4`) redacted; `publish_status = "not_published"` set on those slots. |
| `TBC-STORY-VOICE-01` | **Closed by addition, not removal** | `biz_story` framing `kami berlima` preserved for IA/About page; new `launch_facing_story` field provides client-first copy for landing (Ticket #8). |
| `TBC-PAY-EXPIRY-01` | **Still open** | Provider expiry alignment remains blocking for Slice 3 payment adapter. |
| `TBC-COUPLE-01`, `TBC-STACK-01`, `TBC-CAPACITY-01`, `TBC-BUFFER-01`, `TBC-STAFF-SESSION-01`, `TBC-ACCESS-01`, `TBC-ADMIN-01`, `TBC-API-01`, `TBC-REC-01`, `TBC-LIVE-PRD-01` | **Still open** | Unchanged; outside Ticket #6 scope. |

## Verdict after Round 4

JSON is now aligned with the guide, ADR 0066/0075/0077, and the Round 3 cancellation/refund resolution. Round 2 conflicts R2-02, R2-03, R2-04, R2-05, R2-06, R2-08, R2-09, R2-10 are closed. The remaining `TBC-PAY-EXPIRY-01` and architecture/couple/capacity blockers from Round 1 still gate production launch — implementation readiness does not move from `Boleh dengan catatan`. PRD/design handoff is now **stronger**: a form load → export → parse round-trip will not lose the launch-relevant fields.

---

# Round 5: Ticket #5 settlement uniqueness closure (2026-08-31)

Ticket #5 ("Settlement uniqueness & paid-late package") closed by writing `ADR 0093-payment-settlement-uniqueness.md` and patching three downstream artifacts (`IMPLEMENTATION-GUIDE.md §7`, `DOMAIN-MODEL.md` Payment/refund section, this review's TBC register). The ADR answers all six open questions from the ticket and defines the two acceptance criteria integration tests explicitly.

## What changed in artifacts (Round 5)

- **`docs/adr/0093-payment-settlement-uniqueness.md`** (new) — accepted for MVP, closes `TBC-PAY-SETTLEMENT-01`. Defines the at-most-one successful settlement invariant, value-match requirement, lifetime idempotency with payload fingerprint, out-of-order/repeated-status/reversal mapping table, three-layer crash window strategy, and Option A for `paid_late` package creation. Includes Postgres SQL migration (§6) and D1/SQLite equivalent (§7), plus reference to integration tests for both acceptance criteria.
- **`IMPLEMENTATION-GUIDE.md §7.3–§7.7`** — added: settlement uniqueness invariants (amount/currency/order/merchant match, idempotency lifetime scope, three-layer crash window); Midtrans adapter contract (`PaymentGatewayAdapter` interface with `CreateCheckoutInput`, `VerifiedPaymentEvent`, `FullRefundInput`, `RefundProviderResult`); `paid_late` package effects (slot reacquired vs first session pending); duplicate webhook integration test (§7.6); paid-late package integration test (§7.7).
- **`DOMAIN-MODEL.md` Payment and refund** — added two subsections: "Settlement uniqueness (ADR 0093)" summarizing the uniqueness invariant and value-match/idempotency rules, and "`paid_late` package creation (ADR 0093 §5)" explaining Option A behavior with the two slot-reacquire outcomes.
- **`PRD-GUIDELINE-REVIEW.md` TBC register** — `TBC-PAY-SETTLEMENT-01` row now carries closure evidence with pointer to `ADR 0093` and to `IMPLEMENTATION-GUIDE.md §7.6–§7.7`.

## Key decisions

| Question | Decision | Reference |
|---|---|---|
| At-most-one successful settlement per Booking/purchase intent? | **Unique partial index** `payment(booking_id) WHERE status = 'paid' AND settled_at IS NOT NULL` + app-level precheck (defense-in-depth, same pattern as `ADR 0091`) | ADR 0093 §1.2; guide §7.3 |
| Amount/currency/order/merchant verification? | **Wajib**, bukan hanya signature. Adapter + application second-verification against `OfferSnapshot` and `Booking.snapshotted_amount`. Mismatch → `payment_event_mismatch_log` + rollback. | ADR 0093 §2; guide §7.4 |
| Idempotency key scope? | **Lifetime**, payload fingerprint. Same-key/same-hash → no-op. Same-key/different-hash → typed failure `idempotency_key_collision`. Different-key/same-payload → separate event, no-op transition. | ADR 0093 §3; guide §7.3 |
| Out-of-order / repeated-status / reversal mapping? | Full table in `ADR 0093 §4.1`. `capture`/`settlement` → state transition; `pending` → no-op; `deny`/`cancel`/`expire`/`failure` → `failed`; `refund`/`chargeback` → no-op di `Payment`; `challenge` → Admin review. | ADR 0093 §4; guide §7.3 |
| Crash window strategy? | **Three layers**: (a) createCheckout → persistence (optimistic `Payment status=pending` + idempotency); (b) verified webhook → state transition (handler transaction); (c) transition → outbox delivery (transactional outbox + retry + dead-letter). | ADR 0093 §1.2 + open-follow-up; guide §7.3 |
| `paid_late` package creation? | **Option A**: `PackagePurchase` + ordered `SessionEntitlement` + `PackageValidity` dibuat **tepat saat webhook verified**. Jika reacquire berhasil → `paid_late_slot_reacquired` + entitlement #1 `scheduled`. Jika gagal → `paid_late_first_session_pending` + entitlement #1 `pending_schedule` + `PackagePurchase.requires_first_session_scheduling = true`; Admin resolves via existing flow (`ADR 0067`). | ADR 0093 §5; guide §7.5; domain model "paid_late package creation" |
| Refund effects on partial-used package + future Appointments? | Out of scope for this ADR; explicitly carried forward to **Ticket #10** (Package cancellation matrix & outcome race). Open follow-up listed in `ADR 0093`. | ADR 0093 open follow-up |

## Status of Round 1 conflicts after Round 5

- **P1-10** (Payment/Refund projection, uniqueness, package-refund effects): **Substantially closed**. Uniqueness invariant, value match, idempotency, crash window, and `paid_late` package creation all answered by `ADR 0093`. Remaining sub-finding (refund effects on partial-used package and future Appointments) is **deferred to Ticket #10** and not a payment-side blocker.
- **P1-03** (SlotHold TTL vs payment expiry): still open. `TBC-PAY-EXPIRY-01` not closed by Round 5; ADR 0093 references the SlotHold TTL but does not redefine it.

## TBC register update (Round 5)

|| TBC | Round 5 status | Closure evidence |
|---|---|---|---|
| `TBC-PAY-SETTLEMENT-01` | **Closed** | `ADR 0093-payment-settlement-uniqueness.md`; guide §7.3–§7.7; domain model "Settlement uniqueness" + "`paid_late` package creation"; SQL migration in ADR §6 (Postgres) + §7 (D1/SQLite); integration tests in guide §7.6–§7.7. |
| `TBC-PACKAGE-CANCEL-01` | **Closed by Round 6 (`ADR 0095-package-cancellation-matrix.md`)** | Targets (`appointment`/`booking`/`package_purchase`), open-request invariant via unique partial index, pending-vs-outcome race R1–R4, atomic per-target effects, partial-package 1-of-N, repeat/correction, couple override, RescheduleAction table, D1/SQLite + Postgres migration triggers. Acceptance tests 1–15 in `ADR 0095 §7`. Implementation baseline patches: `IMPLEMENTATION-GUIDE.md §6.2`, §6.3, §13.1, §14 TBC register; `DOMAIN-MODEL.md` Lifecycle + Cancellation transition matrix; guide ADR range `0001–0095`. |
| `TBC-RESCHEDULE-01` | **Closed by Round 6 (`ADR 0095-package-cancellation-matrix.md §5`)** | RescheduleAction forbidden transitions enumerated; replacement capacity overlap via `ADR 0091`; couple-package rules via `BookingParticipant` (`ADR 0090`); cancellation-request rebound (R4). |
| `TBC-NO-SHOW-01` | **Closed by Round 5 (`ADR 0092-appointment-outcome-timing.md`)** | Early `no_show` checkpoint T+15m, late-arrival via `completed_partial`/`no_show_late`, `OutcomeCorrection` window 7×24 jam. |
| `TBC-INTAKE-01`, `TBC-MINOR-01`, `TBC-ELIGIBILITY-01`, `TBC-BOOKING-CUTOFF-01` | **Closed by Round 5 (`ADR 0094-intake-eligibility-cutoff.md`)** | Final intake field schema, minor 16–17 guardian route, eligibility boundary, 1-hour booking cutoff. |
| `TBC-PAY-EXPIRY-01` | **Still open** | Unchanged — outside Round 5/6 scope. |
| `TBC-COUPLE-01` | **Closed by `ADR 0090`** (Round 2 finalization) | Couple `BookingParticipant`/`AppointmentParticipant` model, consent per participant, visibility, ClientAccess scope. |
| `TBC-STACK-01` | **Closed by `ADR 0089`** (Round 5) | Cloudflare Worker + D1 architecture ratified. |
| `TBC-CAPACITY-01`, `TBC-BUFFER-01` | **Closed by `ADR 0091`** | Capacity overlap + TransitionBuffer placement. |
| `TBC-STAFF-SESSION-01`, `TBC-ACCESS-01`, `TBC-ADMIN-01`, `TBC-API-01`, `TBC-REC-01`, `TBC-LIVE-PRD-01`, `TBC-POLICY-RECONCILE-01`, `TBC-CHANNELS-MODEL-01`, `TBC-COUPLE-LAUNCH-01`, `TBC-PROFILE-EXPORT-01`, `TBC-PAY-01`, `TBC-NOTIFY-01`, `TBC-CONSENT-01` | **Still open** | Unchanged. |
| `TBC-LAUNCH-GATE-DETAIL-01` | **Closed by `ADR 0096-launch-gate-checklist.md` (Round 7 / Ticket #07)** | Matrix §7 six gates adopted as executable launch checklist (G-1..G-14, owner-by-owner, blocking stage, concrete acceptance evidence). PRD/design handoff checklist separated from production-launch checklist. Patched into `IMPLEMENTATION-GUIDE.md §16.1–§16.4`. Per-gate evidence collection is operational follow-up tracked via §16.3 dependency map, not a TBC. |
| `TBC-PERSONA-FIELDS-01`, `TBC-STORY-VOICE-01` | **Closed** (carried forward — see Round 4 table above; Round 6 ticket matrix Ticket #8 confirms closure; Round 7 below records the `persona_3_barrier` catch-up) | Round 4 table marked both Closed; Round 6 ticket #8 row marked both Closed; Round 7 caught the `persona_3_barrier == persona_3_goal` copy-paste bug introduced during the Ticket #6 cleanup pass and tightened `launch_facing_story` against IA §6 copy guardrails. |

## Verdict after Round 5

Settlement uniqueness and `paid_late` package effects are now ADR-level resolved. The at-most-one successful settlement invariant is testable, has a DB-level hard guarantee (unique partial index), an application-level soft guarantee (precheck + idempotency record), and an explicit integration test. `paid_late` package creation no longer leaks an undefined state to Admin: the package is created with a clear `requires_first_session_scheduling` flag and a one-state-resolution flow that reuses `ADR 0067`.

Remaining Round 1 blockers (architecture `ADR 0089`, couple participant model `ADR 0090`, capacity overlap `ADR 0091`, no-show timing `ADR 0092`) are now ADR-resolved. Round 5/6 adds settlement uniqueness (`ADR 0093`), intake/eligibility/cutoff (`ADR 0094`), and the package cancellation matrix + outcome race (`ADR 0095`). Round 7 adds the executable launch-gate checklist (`ADR 0096-launch-gate-checklist.md`) which closes `TBC-LAUNCH-GATE-DETAIL-01`. The remaining open TBCs are operational/policy work: `TBC-PAY-EXPIRY-01` (provider TTL alignment), `TBC-STAFF-SESSION-01`, `TBC-ACCESS-01`, `TBC-ADMIN-01`, `TBC-API-01`, `TBC-REC-01`, `TBC-LIVE-PRD-01`, `TBC-POLICY-RECONCILE-01`, `TBC-CHANNELS-MODEL-01`, `TBC-COUPLE-LAUNCH-01`, `TBC-PROFILE-EXPORT-01`, `TBC-PAY-01`, `TBC-NOTIFY-01`, `TBC-CONSENT-01`, plus the new `TBC-EXTENSION-01`. `TBC-PAY-SETTLEMENT-01`, `TBC-PACKAGE-CANCEL-01`, `TBC-RESCHEDULE-01`, `TBC-NO-SHOW-01`, `TBC-PERSONA-FIELDS-01`, `TBC-LAUNCH-GATE-DETAIL-01`, and `TBC-STORY-VOICE-01` rows are preserved as closure evidence for future audits (see Round 7 for the Ticket #7 / Ticket #8 closure narratives and the `persona_3_barrier` catch-up).

---

# Round 6: Ticket inventory closure & MVP-ready summary (2026-08-31)

Round 6 formalizes closure of all ten substantive tickets that gated MVP skeleton coding, declares the conditions under which MVP skeleton code may begin (with `Authorization` placeholder per business-owner instruction), and enumerates the operational TBCs that are **intentionally** left open for post-MVP operational hardening.

## Ticket closure matrix (all 10 tickets)

| # | Ticket | Substantive finding (Round 1 / Round 2) | Closure artifact | Closes TBC |
|---|---|---|---|---|
| 1 | Architecture selection | P0-01 (PRD Teknis `database=supabase` + `architecture=docker` vs Guide Worker+D1) | `ADR 0089-architecture-worker-d1.md` (Cloudflare Worker + D1 + `PersistenceAdapter` seam) | `TBC-STACK-01` |
| 2 | Couple participant model | P0-03 (couple package bookable but no participant/consent/access model) | `ADR 0090-couple-participant-model.md` (`BookingParticipant`/`AppointmentParticipant`, consent per participant, visibility, ClientAccess scope) | `TBC-COUPLE-01` |
| 3 | Capacity overlap & buffer | P1-02 (slot granularity + overlap strategy + buffer placement) | `ADR 0091-capacity-overlap-buffer.md` (CapacityReservation with unique partial index + TransitionBuffer placement; Postgres DDL §6, D1/SQLite §7) | `TBC-CAPACITY-01`, `TBC-BUFFER-01` |
| 4 | No-show timing & late-arrival | P1-12 (15-minute no-show conflicted with "post-session outcome" + correction window) | `ADR 0092-appointment-outcome-timing.md` (early checkpoint `no_show` T+15m locked, 5-value outcome enum, late-arrival via `completed_partial`/`no_show_late`, 7×24h Admin correction via `OutcomeCorrection`, deterministic entitlement coupling) | `TBC-NO-SHOW-01` |
| 5 | Settlement uniqueness & `paid_late` package | P1-10 + R2-04 (at-most-one settlement, value-match, idempotency, crash window, `paid_late` package creation) | `ADR 0093-payment-settlement-uniqueness.md` + guide §7.3–§7.7 + domain model "Settlement uniqueness" / "`paid_late` package creation" (see Round 5 above) | `TBC-PAY-SETTLEMENT-01` |
| 6 | JSON cleanup for launch | R2-02, R2-03, R2-04, R2-05, R2-06, R2-08, R2-09, R2-10 | Edit `seraya-psikologi-nonteknis-2026-08-31.json` directly (sub-tasks 06.1–06.7 + persona trigger rewrite + `launch_facing_story` addition + `booking_help` + `booking_policy` R3 prefix); see Round 4 above | `TBC-PAY-01` (hold/wallet scope), `TBC-INTAKE-01` (launch-minimum fields), `TBC-CHANNELS-MODEL-01`, `TBC-PERSONA-FIELDS-01`, `TBC-PROFILE-EXPORT-01`, `TBC-STORY-VOICE-01` (by addition) |
| 7 | Launch-gate checklist (executable) | R2-13 (JSON `launch_gate` too high-level) | `ADR 0096-launch-gate-checklist.md` + `IMPLEMENTATION-GUIDE.md §16.1–§16.4` (G-1..G-14 owner-by-owner with blocking stage and concrete acceptance evidence; §16.1 PRD-handoff vs §16.2 production-launch; §16.3 gate-to-TBC dependency map; §16.4 release sign-off template) | `TBC-LAUNCH-GATE-DETAIL-01` (Closed by Round 7 / `ADR 0096`) |
| 8 | Persona & biz_story framing | R2-09, R2-10 (persona `trigger == goal`; biz_story `kami berlima` vs Fuja-only launch) | `launch_facing_story` field added in Ticket #6 pass; persona triggers rewritten; `biz_story` retained for IA/About page; copy guardrails from `INFORMATION-ARCHITECTURE-v0.1 §6` applied to landing; **Ticket #8 closure pass** (Round 7 below) caught and fixed the `persona_3_barrier == persona_3_goal` copy-paste residue from the Ticket #6 rewrite and tightened `launch_facing_story` against IA §6 (explicit anti-promise of diagnosis/cure/guaranteed outcomes; 16–17 guardian-nudge) | `TBC-PERSONA-FIELDS-01`, `TBC-STORY-VOICE-01` |
| 9 | Intake schema, minor route, eligibility, cutoff | P0-04 + R2-04 (intake minimum, age policy, eligibility, cutoff) | `ADR 0094-intake-eligibility-cutoff.md` (intake field schema: Nama lengkap + Email wajib + Nomor HP opsional + Consent version; minor 16–17 guardian route; eligibility/exclusion boundary; 1-hour booking cutoff) | `TBC-INTAKE-01`, `TBC-MINOR-01`, `TBC-ELIGIBILITY-01`, `TBC-BOOKING-CUTOFF-01` |
| 10 | Package cancellation matrix & outcome race | P1-13 + R5 carry-forward (package-wide cancellation, pending-vs-outcome race, RescheduleAction transitions, couple override) | `ADR 0095-package-cancellation-matrix.md` + guide §6.2/§6.3/§13.1/§14 + domain model Lifecycle + cancellation transition matrix (15 acceptance tests; R1–R4 race resolution; atomic per-target effects; partial 1-of-N; repeat/correction; couple via `BookingParticipant`) | `TBC-PACKAGE-CANCEL-01`, `TBC-RESCHEDULE-01` |

**Ticket closure summary: 10/10 closed.** Every ticket produces either a new ADR (`0089`–`0095`), a JSON/artifact edit with backup, or a guide/domain-model patch with explicit closure evidence. Round 1 P0-01 through P1-13 are now either fully closed or have a defined deferral path (Ticket #6/7/8 are JSON/guide ops work rather than domain blockers).

## MVP-ready declaration (with operational caveats)

Per business-owner instruction, **MVP skeleton code may begin** because all ten substantive domain blockers have been resolved to ADR-level detail. The conditions are:

### What is MVP-ready now

- **Business scope**: final — CancellationDecision (`approve`/`deny`), refund vocabulary (`full_refund`/`no_refund` only, no public UI, Admin WhatsApp routing), catalog (SERAYA PULANG only, Fuja only), channels (email auto + Admin WhatsApp optional manual support).
- **Architecture**: final — Cloudflare Worker + D1 + `PersistenceAdapter` seam (`ADR 0089`); DDL syntax dual-tracked for Postgres family (`§6`) and D1/SQLite (`§7`).
- **Capacity overlap model**: final — `CapacityReservation` with unique partial index + TransitionBuffer (`ADR 0091`).
- **Intake schema**: final — minimum field set, validation rules, minor 16–17 guardian route, 1-hour cutoff (`ADR 0094`).
- **Settlement uniqueness invariant**: final — at-most-one successful settlement, value-match, idempotency by `payload_hash`, three-layer crash window (`ADR 0093`).
- **Couple participant model**: final — `BookingParticipant`/`AppointmentParticipant` + per-participant consent + visibility + ClientAccess scope (`ADR 0090`).
- **No-show timing**: final — early checkpoint at T+15m, late-arrival via `completed_partial`/`no_show_late`, 7×24h Admin correction (`ADR 0092`).
- **Package cancellation matrix**: final — target types (`appointment`/`booking`/`package_purchase`), at-most-one open request invariant, R1–R4 race resolution, atomic per-target effects, RescheduleAction table (`ADR 0095`).
- **Launch gate (design)**: final — `SERVICE-POLICY-MATRIX-v0.1 §7` adopted as executable checklist; only evidence collection remains ops work.
- **JSON source**: aligned — Ticket #6 cleanup applied; field round-trip preserved.

### `Authorization` placeholder per business-owner instruction

Because `TBC-STAFF-SESSION-01`, `TBC-ACCESS-01`, and `TBC-ADMIN-01` are still open as **operational** work (not domain blockers), the skeleton's `Authorization` module may be implemented against a **clearly-labelled placeholder interface** with the following constraints:

1. The placeholder must encode the *roles* that ADRs 0078/0079/0080/0081/0082 already commit to: `client`, `psychologist`, `admin`, with `admin` split into separate-action authority for cancellation/refund, two-Admin bootstrap, Google SSO as identity provider, and `BookingParticipant`-scoped couple access.
2. The placeholder must reject any call from an unauthenticated principal except those routed through `ClientAccess` token verification (per `ADR 0020`/`0046`), with the verification path stubbed but typed.
3. The placeholder must NOT hardcode a session policy (TTL, cookie flags, CSRF, re-auth, revocation). These remain the explicit deliverable of `TBC-STAFF-SESSION-01` and must be filled in before the staff slice moves from skeleton to wiring.
4. Each call site that touches the placeholder must carry a `// TODO(staff-session):` marker linked to `TBC-STAFF-SESSION-01` so the gap is auditable.

This is consistent with the Round 1 verdict row "Architecture-neutral foundation" (`Boleh mulai sebagian`) — the foundation is now no longer architecture-neutral but is MVP-stack-concrete; only the staff-session wiring is deferred.

### Operational TBCs that remain open (intentionally)

These are **not** blockers for MVP skeleton coding because they are operational hardening, not domain semantics. They are listed here as the explicit caveat set:

| TBC | Concern | Why intentionally deferred | Required before |
|---|---|---|---|
| `TBC-STAFF-SESSION-01` | Staff session lifecycle (OAuth state/nonce, cookie/CSRF, re-auth, revocation, recovery) | Needs concrete IdP selection (Google SSO is decided but contract not finalized), last-Admin recovery invariant per `ADR 0081`, and threat model | Staff slice wiring, before any staff login reaches production |
| `TBC-ACCESS-01` | ClientAccess token lifecycle edge cases | Guest flow uses email magic link/OTP (`ADR 0020`/`0046`); token rotation, expiry edge cases, and revoke paths belong to ops hardening | Production booking flow with real email provider |
| `TBC-ADMIN-01` | Admin workspace acceptance baseline | Admin cancellation/refund workspace is specified (`ADR 0067`) but the full admin field matrix, RBAC acceptance, and audit-replay test plan are not | Production admin access |
| `TBC-API-01` | Public/internal API surface contract | Worker route surface exists; OpenAPI/types, rate-limit, idempotency-on-write contract are ops work | Public API exposure (currently only Worker→Worker internal) |
| `TBC-REC-01` | Reconciliation runbook for late / orphan payment events | Provider event idempotency is finalized (`ADR 0093`); runbook for operator action when an event is missed or out-of-order is ops work | First production payment incident |
| `TBC-LIVE-PRD-01` | Live PRD ↔ guide reconciliation as canonical source-of-truth | Form schema drift and revision-history work is required before collaborative editing is reliable | Next PRD edit cycle |
| `TBC-CONSENT-01` | Consent copy sign-off | 8-section consent text exists in JSON; legal/clinical sign-off before publish is ops work | Production publish |
| `TBC-NOTIFY-01` | Notification provider + copy + offsets + quiet hours | Email is confirmed primary (`ADR 0021`); provider selection (Resend? SES? Postmark?), reminder copy (`ADR 0052`/`0053`), quiet hours, and bounce handling are ops work | First transactional email in production |
| `TBC-PAY-EXPIRY-01` | SlotHold TTL ↔ provider expiry invariant | Provider expiry behavior (QRIS vs VA) is the operational piece that decides exact TTL value and reconciliation path | Payment adapter live with real provider |
| `TBC-PAY-01` (TTL alignment) | (above) | (above) | (above) |
| `TBC-EXTENSION-01` | Package validity extension authority & audit | Calendar-period model is decided (`ADR 0055`); who can extend and under what audit signal is ops work | First extension request |
| `TBC-COUPLE-LAUNCH-01` | Couple day-one bookable decision | Model is final (`ADR 0090`); whether couple is bookable on day one is a business launch decision separate from the model | Launch day |
| `TBC-LAUNCH-GATE-DETAIL-01` | **Closed by `ADR 0096-launch-gate-checklist.md` (Round 7)** | Matrix §7 adopted as executable checklist with owner/blocking-stage/evidence per gate (`IMPLEMENTATION-GUIDE.md §16.1–§16.4`). Per-gate evidence collection is tracked via §16.3 dependency map and §16.4 sign-off template — not a TBC | Production launch |

### What is **not** MVP-ready (and was not before)

- Production launch itself — gated by operational TBCs above, by evidence collection on the launch gate, and by live PRD reconciliation.
- Public-facing content module / CMS — `IMPLEMENTATION-GUIDE.md` does not yet define `ContentModule`, `CrisisNotice`, or measurable accessibility / performance / SEO acceptance. R2-13's content-side items remain.
- End-to-end feature wiring for staff and admin — depends on `TBC-STAFF-SESSION-01` and `TBC-ADMIN-01` being closed.

## Recommended coding order, given MVP-ready declaration

1. **Foundation slice (was Slice 0)** — vocabulary, typed errors, fake clock, fixtures, idempotency/correlation primitives, `PersistenceAdapter` seam against `ADR 0089`. *Now stack-concrete, not architecture-neutral.*
2. **Catalog/availability (Slice 1)** — catalog types, pricing snapshot model, public shell. Use `ADR 0091` for overlap semantics.
3. **Booking/hold (Slice 2)** — use `ADR 0094` intake schema, `ADR 0090` couple participant, `ADR 0091` capacity overlap, `ADR 0089` Worker+D1 persistence.
4. **Payment adapter (Slice 3)** — `ADR 0093` settlement uniqueness, value-match, idempotency, three-layer crash window. *Note: production live requires `TBC-PAY-EXPIRY-01`.*
5. **Package (Slice 4)** — `ADR 0094` intake, `ADR 0095` package cancellation matrix, `ADR 0090` couple.
6. **Staff/ClientAccess (Slice 5)** — `Authorization` placeholder per business-owner instruction; close `TBC-STAFF-SESSION-01`/`TBC-ACCESS-01` before wiring staff login to production.
7. **Cancellation/refund (Slice 6)** — `ADR 0095` matrix; `ADR 0077` `full_refund`/`no_refund` only; Admin WhatsApp as public channel per Round 3.
8. **Notifications (Slice 7)** — event intents and fake adapter against `ADR 0052`/`0053`; provider selection deferred (`TBC-NOTIFY-01`).
9. **Privacy/retention (Slice 8)** — policy schema and dry-run per `ADR 0083`/`0085`/`0086`/`0087`; no destructive production action until `TBC-REC-01` is closed.
10. **CMS/UAT (Slice 9)** — content, crisis, legal copy, a11y/perf/SEO acceptance. *Not yet ready — outside MVP skeleton scope.*

## Verdict after Round 6

All ten substantive tickets are closed. The MVP skeleton code can begin against `ADR 0089` (Worker + D1) with the `Authorization` placeholder per business-owner instruction. The skeleton is not the same as production launch: production launch remains gated by the operational TBCs listed above and by evidence collection on the `SERVICE-POLICY-MATRIX-v0.1 §7` release checklist. Each open operational TBC has a "required before" criterion that prevents it from becoming a silent regression risk; each ADR-deliverable ticket has a closure artifact with file path and pointer to acceptance tests, so future audits can trace requirement → ADR → test → gate.

---

# Round 7: Ticket #8 closure pass (2026-08-31)

Ticket #8 ("Persona & biz_story framing") was already marked Closed in the Round 6 ticket matrix (line above), with the substantive edits — `launch_facing_story` addition, persona trigger rewrite, `biz_story` retention — performed during the Ticket #6 cleanup pass (Round 4). The dedicated Ticket #8 closure pass exists to:

1. catch one copy-paste residue left over from the Ticket #6 trigger rewrite (`persona_3_barrier == persona_3_goal`),
2. tighten `launch_facing_story` against the explicit `INFORMATION-ARCHITECTURE-v0.1 §6` copy guardrails (no promise of diagnosis/cure/guaranteed outcomes/emergency),
3. reconcile two stale references to `TBC-PERSONA-FIELDS-01` and `TBC-STORY-VOICE-01` that lingered in the Round 5 inventory/verdict after Round 4 had already marked them Closed, and
4. close the vault ticket at `Projects/Seraya Psikologi/Tickets/Ticket 08 — Persona & biz_story framing.md`.

## What changed in artifacts

### 7.1 — `persona_3_barrier` catch-up

| Field | Before | After |
|---|---|---|
| `persona_3_barrier` | Identical to `persona_3_goal` (162 chars; copy-paste residue from the Ticket #6 trigger rewrite) | "Waktu kerja panjang & kelelahan sehingga konseling terasa 'nggak sempat', khawatir pasangan/anak tahu dan dianggap 'gak kuat', bingung cerita ke psikolog tanpa menambah beban pikiran setelah hari yang sudah berat" (212 chars; concrete obstacles matching the Ticket #8 08.1 definition: izin ortu, stigma, biaya) |

Programmatic re-check confirms the full 3×3 distinctness matrix now holds for `goal`/`trigger`/`barrier` across all three personas (`persona_1`/`_2`/`_3`). `persona_1_barrier` (izin ortu, stigma teman sebaya) and `persona_2_barrier` (harga, bingung pilih psikolog, stigma "lebay/gila") were already distinct from their goals and are preserved unchanged — they satisfied the Ticket #8 08.1 definition on the first pass.

### 7.2 — `launch_facing_story` tightening per IA §6

| Concern (IA §6 guardrail) | Before (Round 4) | After (Round 7) |
|---|---|---|
| Lead with client situation (not program names) | ✅ "Kalau kamu lagi di titik yang rasanya berat…" (already client-first) | Preserved |
| No promise of diagnosis | Implicit (omitted) | **Explicit**: "Bukan tempat untuk diberi diagnosa, dijanjikan solusi instan, atau dipaksa untuk langsung 'sembuh' — hanya ruang untuk bercerita, dipahami, dan melanjutkan proses dengan lebih ringan." |
| No promise of cure/guaranteed outcome | Implicit (omitted) | **Explicit** (same sentence as above — addresses both diagnosis and cure in one clause) |
| No promise of emergency support | ✅ (no emergency language in either version; `crisis` field carries the non-emergency boundary copy separately) | Preserved |
| No promise of availability that does not exist | ✅ ("satu psikolog launch, Fuja… seiring waktu, tim kami akan bertambah") | Preserved |
| Concise, non-clinical language | ✅ | Preserved |
| 16–17 guardian route (IA §6 final bullet) | Omitted | **Added**: "Untuk usia 16–17, sesi dilakukan bersama orang tua/wali sesuai ketentuan yang berlaku." |
| Names Fuja as the launch psychologist | ✅ ("Kami memulai dengan satu psikolog launch, Fuja") | Preserved |

`biz_story` (3650 chars) is **preserved unchanged** with the `kami berlima` framing intact for the IA/About page (per Round 4 / R2-10). The two fields coexist: `biz_story` for the brand-origin surface, `launch_facing_story` for the conversion-critical landing surface.

### 7.3 — Stale-inventory reconciliation

The Round 5 inventory row at the previous line 974 and the Round 5 verdict at the previous line 980 both listed `TBC-PERSONA-FIELDS-01` and `TBC-STORY-VOICE-01` as "Still open" — a stale carry-over from before Round 4 marked them Closed. Both rows have been corrected:

- The Round 5 inventory now separates the two TBCs into a new "**Closed**" row pointing at Round 4 + Round 6 ticket #8 + Round 7 below.
- The Round 5 verdict enumeration drops both TBCs from the "remaining open" list and adds them to the "preserved as closure evidence" list alongside `TBC-PAY-SETTLEMENT-01`, `TBC-PACKAGE-CANCEL-01`, `TBC-RESCHEDULE-01`, and `TBC-NO-SHOW-01`.

### 7.4 — Vault ticket status flip

`Projects/Seraya Psikologi/Tickets/Ticket 08 — Persona & biz_story framing.md` status line flipped from `Status: **Open**` to `Status: **Closed (2026-08-31)**` with a closure-reference pointing at Round 7 (this section) and the JSON edits in `seraya-psikologi-nonteknis-2026-08-31.json`.

### 7.5 — Metadata (`_meta.ticket_cleanup`)

The JSON `_meta.ticket_cleanup.extra_fixes` list gained two new entries (Ticket #8 08.1 and 08.2) and a new sibling `ticket_8_followup` block carrying the closed-at timestamp and sub-task list. The Ticket #6 metadata (originating pass) is preserved.

## Backup & validation

| Check | Result |
|---|---|
| Pre-edit backup created | `/home/jar/.hermes/cache/documents/backups/doc_15bf6007981d_seraya-psikologi-nonteknis-2026-08-31.json.20260831-151817.bak` (35539 bytes; matches Round 4 end-state) |
| `json.loads()` succeeds on edited file | ✅ (154 top-level keys; +0 net, only field values changed) |
| Persona 3×3 distinctness matrix (`goal`/`trigger`/`barrier`) | ✅ all three personas have three pairwise-distinct values |
| `biz_story` contains `kami berlima` | ✅ (preserved) |
| `launch_facing_story` present | ✅ (998 chars; was 786 chars — added IA §6 guardrail sentences) |
| `launch_facing_story` names Fuja | ✅ |
| `launch_facing_story` contains explicit anti-promise of diagnosis/cure | ✅ |
| `launch_facing_story` contains 16–17 guardian-nudge sentence | ✅ |
| `_meta.ticket_cleanup.ticket_8_followup` present | ✅ |
| Round-trip (json.dumps → json.loads) | ✅ identical content |
| Other TBC-relevant fields still intact | ✅ `booking_hold=10 menit`, `pay_methods=[qris,va]`, `pay_methods_deferred` enumerated, `client_access=guest_primary_with_optional_linking`, `automated_channels=[email]`, `support_channels` carries WA + calendar qualifiers, `channels_deprecated` preserved, `booking_access_deprecated="account"` preserved, `psychologist_{1..4}_publish_status` set, `profile_proof_tbc` and `landing_sections_tbc` carry schema-mismatch notes |

## TBC register update (Round 7)

| TBC | Round 7 status | Closure evidence |
|---|---|---|
| `TBC-PERSONA-FIELDS-01` | **Closed (confirmed)** | Round 4 (trigger rewrite distinct from goal, programmatic check passed) + Round 7 §7.1 (barrier fixed for persona_3; full 3×3 distinctness matrix verified). All three personas now have `goal` ≠ `trigger` ≠ `barrier` pairwise. |
| `TBC-STORY-VOICE-01` | **Closed (confirmed)** | Round 4 (`launch_facing_story` added; `biz_story` `kami berlima` preserved) + Round 7 §7.2 (IA §6 copy-guardrail tightening: explicit anti-promise, 16–17 guardian route, Fuja named). Two-field coexistence model is final. |

## Verdict after Round 7

Ticket #8 is **Closed**. The two TBCs (`TBC-PERSONA-FIELDS-01`, `TBC-STORY-VOICE-01`) are confirmed Closed at every level: Round 4 table, Round 6 ticket matrix, and Round 7 reconciliation. The two-field coexistence model (`biz_story` for brand/About, `launch_facing_story` for landing) is the final framing. The `persona_3_barrier` catch-up is the kind of residue that Round 4 should have caught but did not — Round 7 is the audit pass that closed the loop. Future PRDs that touch persona fields should preserve the 3×3 distinctness invariant as part of the schema definition, not rely on copy-paste discipline.

