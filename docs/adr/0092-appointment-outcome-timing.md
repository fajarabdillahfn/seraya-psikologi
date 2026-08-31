# 92. Finalize Appointment Outcome Timing, Late-arrival, and Correction Window

## Status

Accepted. This ADR is the **final model** for no-show timing, late-arrival handling, and outcome correction on the launch counseling product. It supersedes the open questions in `ADR 0015-appointment-outcomes.md` (line 40), `ADR 0026-entitlement-consumption.md` (line 38), `ADR 0027-no-show-consumption.md` (line 33), `ADR 0028-no-show-grace-period.md` (line 35), and `ADR 0054-outcome-correction-events.md` (line 35). It closes `TBC-NO-SHOW-01` from `PRD-GUIDELINE-REVIEW.md:499`. It is compatible with the couple participant model in `ADR 0090`.

## Ringkasan eksekutif (Bahasa Indonesia)

- **`no_show` adalah early operational checkpoint pada T+15 menit**, bukan terminal post-session outcome. Ia mengunci entitlement consumption sejak T+15 dan menjadi history; sesi masih dapat berlangsung dan outcome akhirnya ditentukan oleh psikolog di akhir sesi (`completed` atau varian `completed_partial` / `no_show_late`).
- **Grace period 15 menit** dari scheduled start (`Asia/Jakarta`) tidak berubah dari `ADR 0028`. Sistem otomatis menandai `no_show` checkpoint pada T+15 jika tidak ada explicit `client_arrived` event yang direkam.
- **Late-arrival**:
  - Klien yang datang terlambat tetap diterima. Psikolog merekam `client_arrived` (timestamp) yang membatalkan auto-checkpoint `no_show`.
  - Jika sesi berjalan ≥1 menit efektif (diukur dari `client_arrived` sampai `session_ended`): outcome akhir `completed_partial` (subtype dari `completed`). Entitlement ter-konsume penuh karena slot dipakai; Admin dapat memberi compensation token (entitlement tambahan tanpa refund monetary) melalui Admin workspace, audited.
  - Jika klien tidak datang sebelum T+15: `no_show` checkpoint terkunci. Klien yang datang setelah T+15 (mis. T+20) tetap diterima, tetapi outcome akhir `no_show_late` (subtype) dan **entitlement tetap ter-konsume** (slot sudah auto-marked). Tidak ada refund otomatis.
- **Correction window**: Admin boleh membuat `OutcomeCorrection` event hingga **7×24 jam (7 hari kalender)** setelah `marked_at` outcome. Lewat window, outcome immutable; perubahan hanya dapat dilakukan melalui `CancellationDecision` baru (untuk `cancelled`) atau melalui explicit Admin extension/exception yang di-audit terpisah.
- **Entitlement coupling**:
  - `no_show` checkpoint (T+15): consume entitlement pada saat marking. Coupled.
  - `completed` / `completed_partial` / `no_show_late`: consume entitlement. Coupled.
  - `cancelled` (approved): tidak consume; restore jika entitlement valid. Decoupled.
  - Correction `no_show → completed` atau `completed → no_show` dalam 7 hari: adjust entitlement atomically dengan event koreksi. Original outcome tetap immutable history.
- **Notification**:
  - T+15 auto-`no_show`: email ke klien (template `no_show_recorded`, copy netral non-klinis) + notifikasi internal ke Admin workspace (in-app + email).
  - Saat psikolog menandai outcome akhir (di end-of-session atau lewat Admin correction): email ke klien (`outcome_finalized`) + audit record.
  - Late-arrival `client_arrived` event **tidak** trigger notifikasi ke klien (untuk menghindari spam); event muncul di Admin workspace saja.
  - Correction dalam window 7 hari: email ke klien (`outcome_corrected`, menyebutkan old → new outcome tanpa clinical framing).
- **Authority**: psikolog menandai initial dan final outcome; Admin menandai initial atas nama psikolog jika psikolog tidak reachable, dan satu-satunya actor untuk `OutcomeCorrection`. Couple session mengikuti `ADR 0090` dengan `AppointmentParticipant.presence_status` tetap dicatat terpisah.

## Context

`ADR 0015-appointment-outcomes.md:13–20` mendefinisikan `completed`/`no_show` sebagai post-session outcomes. `ADR 0028-no-show-grace-period.md:11–15` mengizinkan `no_show` marking 15 menit setelah scheduled start dan langsung mengonsumsi entitlement (`ADR 0027`). Dengan sesi 60 menit (`ADR 0073`), konsumsi entitlement terjadi saat masih tersisa 45 menit sesi, sementara late-arrival handling dan correction window belum diputuskan (`ADR 0028:33–35`, `ADR 0054:33–35`). `PRD-GUIDELINE-REVIEW.md` P1-12 (`PRD-GUIDELINE-REVIEW.md:400–411`) mengangkat kontradiksi ini sebagai blocker.

Pertanyaan yang harus dijawab:

1. Apakah `no_show` early operational checkpoint atau terminal post-session outcome?
2. Kapan `no_show` dianggap final?
3. Bagaimana late-arrival ditangani (sesi berlanjut? partial completed? outcome khusus)?
4. Berapa lama Admin boleh mengoreksi outcome dengan audited `OutcomeCorrection`?
5. Apakah `no_show` selalu konsumsi entitlement, atau berdasarkan durasi attended?
6. Kapan klien/Admin diberi tahu tentang outcome?

## Diskusi multi-perspektif

### Operations

- **Checkpoint vs terminal outcome**: early checkpoint mengunci entitlement consumption pada T+15 sehingga package balance, refund calculation, dan reporting tidak menggantung pada psikolog menandai outcome di akhir sesi. Terminal post-session outcome akan membiarkan balance menggantung 45 menit dan meningkatkan risiko drift jika psikolog lupa/terlambat menandai. **Early checkpoint lebih aman untuk operasional**, dengan konsekuensi: late-arrival harus ditangani secara eksplisit karena checkpoint sudah terkunci.
- **Late-arrival friction**: model "checkpoint + late arrival tetap diterima" membutuhkan dua event terpisah (`no_show` checkpoint pada T+15, lalu outcome akhir di end-of-session). Ini menambah dua state per Appointment. Alternatif "checkpoint final, late arrival diabaikan" lebih sederhana tetapi menghukum klien yang terlambat karena akses (macet, link rusak). Operasional lebih memilih fleksibilitas.
- **Compensation token**: untuk `completed_partial`, refund monetary tidak tersedia (launch refund hanya `full_refund` atau `no_refund` per `ADR 0077`). Memberi entitlement tambahan sebagai compensation adalah kompromi yang audited dan reversible.
- **Correction window**: 7 hari adalah rentang yang cukup untuk Admin menanggapi case review dari klien via WhatsApp (admin SLA `ADR 0066`) tanpa membiarkan koreksi tidak terbatas. Lewat 7 hari, integrity historical reporting terjaga.

### Clinical/ethics

- `no_show` adalah **operational label**, bukan clinical judgment. Copy template harus menyebut "tidak hadir pada sesi" bukan "tidak menyelesaikan sesi" untuk menghindari framing klinis.
- `completed_partial` bukan "kurang berhasil"; itu hanya indikator durasi attended <60 menit. Tidak boleh dipakai untuk menurunkan outcome quality assessment.
- `no_show_late` (klien datang terlambat setelah T+15) berbeda dari `no_show` checkpoint di mata operasional (entitlement tetap consumed) tetapi klien tetap dilayani sebagian. Ini harus dijelaskan di komunikasi klien, bukan hanya internal.

### Engineering

- Dua timestamp harus disimpan atomically dengan outcome: `marked_at` (saat auto-checkpoint di T+15 atau saat psikolog menandai di akhir) dan `client_arrived_at` (nullable, hanya jika klien terlambat datang). Schema D1: tambah kolom nullable pada tabel `appointment_outcome` (atau projection equivalent).
- OutcomeCorrection membawa field `correction_window_deadline_at` yang di-compute dari `marked_at + 7 hari`. UI Admin menampilkan countdown dan menolak koreksi lewat deadline dengan error `correction_window_expired`.
- Idempotency: command `MarkAppointmentOutcome` (initial/final) dan `CorrectAppointmentOutcome` membawa `idempotency_key`; duplicate call return existing record tanpa side effect. `RecordClientArrived` (event baru) membawa `idempotency_key` per appointment.

### UX

- Email template `no_show_recorded` (T+15): subjek "Sesi [tanggal] tercatat tidak hadir", body: rangkuman jadwal,提醒 bahwa sesi masih dapat dimulai jika klien terlambat, instruksi untuk menghubungi Admin via WhatsApp jika ada kesalahan.
- Email `outcome_corrected`: subjek "Pembaruan catatan sesi [tanggal]", body: old → new outcome, tanggal koreksi, kontak Admin untuk pertanyaan.
- Tidak ada perubahan UI pada ClientAccess selain halaman "booking saya" yang sudah ada (`IMPLEMENTATION-GUIDE.md §10`).

## Decision

Model final menggunakan tiga konsep outcome yang terpisah secara konseptual tapi tetap berasal dari satu enum `appointment_outcome`:

1. **Early checkpoint** (auto-generated pada T+15 jika tidak ada `client_arrived`): `no_show`. Locked at marking. Consumes entitlement.
2. **Final outcome** (marked by psychologist at end-of-session atau lewat Admin): `completed` | `completed_partial` | `no_show_late` | `cancelled` (via `CancellationDecision`). Consumes entitlement kecuali `cancelled`.
3. **Correction** (Admin-only, audited, append-only `OutcomeCorrection`): up to 7 hari kalender setelah `marked_at`.

### 1. Grace period dan auto-checkpoint

- **Grace period: 15 menit** dari scheduled start (Asia/Jakarta). Tidak berbeda per ServiceOffering.
- Pada T+15, jika `client_arrived_at IS NULL`, sistem menandai `no_show` checkpoint dengan `marked_by = system`, `marked_at = scheduled_start + 15m`, dan mengirim notifikasi.
- Pada T+15, jika `client_arrived_at IS NOT NULL`, **tidak ada auto-checkpoint**. Outcome final ditentukan psikolog di end-of-session.
- Auto-checkpoint hanya terjadi jika Appointment status masih `confirmed` (bukan `cancelled`, `rescheduled`, atau sudah ada final outcome).

### 2. Late-arrival handling

- **Klien datang kapan saja sebelum atau setelah T+15**: psikolog atau Admin merekam event `client_arrived` (timestamp). Sistem menerima event kapanpun, tetapi efek berbeda:
  - `client_arrived_at <= scheduled_start + 15m`: batalkan auto-checkpoint. Outcome final di end-of-session: `completed` (default) atau `completed_partial` (jika durasi attended <60 menit).
  - `client_arrived_at > scheduled_start + 15m`: checkpoint `no_show` sudah terkunci; catat `client_arrived_at` sebagai informational. Outcome final di end-of-session: `no_show_late`. Entitlement tetap consumed.
- **Durasi attended**: dihitung dari `client_arrived_at` (atau `scheduled_start` jika klien on-time) sampai `session_ended_at` (event baru yang direkam oleh psikolog).
  - `>= 60 menit`: `completed`.
  - `>= 1 menit dan < 60 menit`: `completed_partial`. Entitlement tetap consumed; compensation token eligibility flag di-set pada Appointment.
- **Tidak ada outcome `cancelled` lewat late-arrival**: late-arrival yang berakhir dengan klien pergi lagi tanpa sesi efektif adalah `no_show` (jika T+15 lewat) atau `completed_partial` (jika T+15 belum lewat dan durasi 1–59 menit).

### 3. Final outcome enum dan semantics

```
appointment_outcome:
  - completed            # sesi berjalan ≥60 menit
  - completed_partial    # sesi berjalan 1–59 menit (late arrival atau early end)
  - no_show              # auto-checkpoint T+15, klien tidak datang sebelum T+15
  - no_show_late         # klien datang setelah T+15, sesi berjalan ≥1 menit
  - cancelled            # via CancellationDecision approve
```

- `completed`, `completed_partial`, `no_show`, `no_show_late` consume entitlement. `cancelled` tidak consume.
- `no_show` dan `no_show_late` adalah operational labels, bukan clinical judgment. UI copy harus netral.
- Untuk couple session, `AppointmentParticipant.presence_status` dicatat terpisah mengikuti `ADR 0090 §5`. Outcome appointment level tetap salah satu dari lima nilai di atas.

### 4. Correction window dan OutcomeCorrection

- **Window: 7×24 jam (7 hari kalender)** dari `marked_at` original outcome. Asia/Jakarta.
- Lewat window: outcome immutable. Perubahan hanya via:
  - `CancellationDecision` baru (untuk mengubah ke `cancelled`).
  - Explicit Admin extension/exception action (TBD di `TBC-EXTENSION-01`, di luar scope ADR ini).
- `OutcomeCorrection` event membawa:
  - `original_outcome` (immutable reference);
  - `new_outcome` (salah satu dari `completed` | `completed_partial` | `no_show` | `no_show_late` | `cancelled`);
  - `reason_category` (enum: `client_provided_evidence` | `admin_data_correction` | `system_clock_error` | `other`);
  - `reason_text` (maks 200 karakter, non-klinis);
  - `actor_admin_id`, `actor_admin_email`, `marked_at_correction`;
  - `entitlement_delta` (computed: +1 jika dari `no_show`/`no_show_late` ke `completed*`, -1 jika sebaliknya, 0 jika tidak ada entitlement effect);
  - `refund_action_required` (bool, default false);
  - `correction_window_deadline_at` (untuk audit; harus = `marked_at_original + 7 hari`).
- Correction **tidak** menghapus original outcome; original tetap di-history.
- Correction **dapat** memerlukan `RefundAction` terpisah jika Admin juga memutuskan `full_refund`. Ini bukan satu transaction dengan correction; Admin mengeksekusi refund command terpisah (`ADR 0067`).
- Compensation token (untuk `completed_partial`): Admin membuat `EntitlementCredit` event (TBC di `TBC-EXTENSION-01`, di luar scope ADR ini). ADR ini hanya mencatat eligibility flag.
- Duplicate `OutcomeCorrection` dengan idempotency key yang sama: return existing event, no side effect.
- Dua koreksi berurutan dalam window: koreksi kedua merujuk ke outcome hasil koreksi pertama (lineage chain), tetapi original outcome tetap referensi pertama. Ini audited via `previous_correction_id`.

### 5. Authority

| Action | Actor | Window | Notes |
|---|---|---|---|
| Auto-checkpoint `no_show` | system | T+15 | jika `confirmed` dan `client_arrived_at IS NULL` |
| Record `client_arrived` | psychologist \| admin | kapan saja sebelum final outcome | timestamp dicatat |
| Record `session_ended` | psychologist \| admin | kapan saja setelah `client_arrived_at` (atau scheduled_start jika on-time) | timestamp dicatat |
| Mark final outcome | psychologist (assigned) \| admin (override) | setelah scheduled_start, sebelum OutcomeCorrection window dari auto-checkpoint | initial marking |
| Mark `cancelled` | admin via CancellationDecision | sesuai `ADR 0051` | bukan via late-arrival path |
| `OutcomeCorrection` | admin only | dalam 7 hari kalender dari `marked_at` | audited, append-only |

### 6. Entitlement coupling table

| Outcome | Entitlement effect | Coupling | Reversible via OutcomeCorrection dalam 7 hari? |
|---|---|---|---|
| `no_show` (auto-checkpoint T+15) | consumed | coupled | ya, ke `completed`/`completed_partial` jika ada bukti kehadiran |
| `completed` | consumed | coupled | ya, ke `completed_partial`/`no_show`/`no_show_late` |
| `completed_partial` | consumed | coupled | ya, dengan evidence |
| `no_show_late` | consumed | coupled | ya, ke `completed`/`completed_partial` jika durasi attended efektif |
| `cancelled` (via CancellationDecision) | tidak consumed; restored jika valid | decoupled | di luar scope; CancellationDecision adalah command terpisah |

`SessionEntitlement.status` transisi:

```
available → scheduled → consumed         # completed, completed_partial, no_show, no_show_late
available → scheduled → available        # cancelled approved (restore jika valid)
consumed → available                     # OutcomeCorrection yang me-restore entitlement (dalam window 7 hari)
```

### 7. Notification

| Event | Recipient | Channel | Template ID |
|---|---|---|---|
| Auto-checkpoint `no_show` di T+15 | client | email | `no_show_recorded` |
| Auto-checkpoint `no_show` di T+15 | admin | in-app + email | `no_show_admin_alert` |
| `client_arrived` recorded | admin only (in-app) | in-app | `client_arrived_admin` |
| Final outcome marked oleh psikolog | client | email | `outcome_finalized` |
| Final outcome marked oleh Admin override | client + admin | email + in-app | `outcome_finalized_admin` |
| `OutcomeCorrection` dalam window 7 hari | client | email | `outcome_corrected` |
| `OutcomeCorrection` di luar window (rejected) | admin | in-app | `correction_window_expired` |

Email `outcome_finalized` untuk `no_show_late` menyertakan kalimat: "Sesi Anda tercatat tetap berlangsung setelah waktu mulai yang dijadwalkan. Entitlement sesi ini telah tercatat terpakai sesuai kebijakan; silakan hubungi Admin via WhatsApp jika ada pertanyaan."

Email `outcome_corrected` netral: tidak menyebut clinical framing; hanya "Pembaruan catatan sesi" dengan old → new outcome dan tanggal koreksi.

Reminder normal 24h/2h (`ADR 0052`) tidak berubah.

## Consequences

Positive:

- Entitlement consumption deterministic sejak T+15 — package balance, reporting, refund calculation stabil.
- Late-arrival tetap dihormati tanpa membatalkan checkpoint, sehingga klien tidak dirugikan akibat akses (macet, link rusak).
- Correction window 7 hari cukup untuk Admin menanggapi evidence dari klien tanpa risiko historical drift berkepanjangan.
- Notification copy eksplisit di setiap transisi outcome mengurangi ambiguity bagi klien.
- Couple session di `ADR 0090` tidak perlu patch: outcome enum baru (5 nilai) tetap compatible dengan `AppointmentParticipant.presence_status`.

Costs and constraints:

- Schema baru: kolom `client_arrived_at`, `session_ended_at`, `effective_attended_minutes` (computed) pada outcome/projection; enum outcome di-extend.
- Email template baru: `no_show_recorded`, `no_show_admin_alert`, `client_arrived_admin`, `outcome_finalized`, `outcome_finalized_admin`, `outcome_corrected`, `correction_window_expired`.
- Admin workspace UI: tampilkan outcome enum baru, `correction_window_deadline_at` countdown, original vs current outcome.
- Notification provider load naik ~2 email per Appointment (T+15 auto-checkpoint + final outcome); untuk launch dengan 1 psikolog, beban rendah.
- 7 hari window mengunci integritas reporting jangka panjang; Admin yang telat menanggapi evidence klien lewat 7 hari harus menggunakan CancellationDecision atau extension (di luar scope).
- Late-arrival handling memerlukan psikolog/Admin untuk secara aktif menandai `client_arrived` dan `session_ended`. Tanpa pencatatan, default fallback ke `no_show` (jika T+15 lewat) atau `completed` (jika on-time).
- `compensation_token` dan `EntitlementCredit` deferred ke `TBC-EXTENSION-01`; untuk launch, Admin menandai eligibility via flag tanpa sistem entitlement credit otomatis.

## Open follow-up

- `TBC-EXTENSION-01` — implementasi `EntitlementCredit` dan compensation token untuk `completed_partial`. Di luar scope ADR ini.
- `TBC-NOTIFY-02` — final wording email template Indonesia untuk `no_show_recorded`, `outcome_corrected`, dan copy `no_show_late`. Owner: operations/clinical sign-off.
- `TBC-COMPENSATION-POLICY-01` — kapan Admin wajib vs optional memberi compensation token untuk `completed_partial`. Default launch: optional.
- `TBC-CLOCK-01` — server clock drift handling; client tidak boleh percaya dengan `client_arrived_at` yang datang dari browser tanpa server-side validation. Recommended: psikolog/Admin merekam dari Admin workspace dengan server timestamp; client tidak punya UI untuk self-mark arrival pada launch.

## Reference

- `ADR 0015-appointment-outcomes.md` — appointment outcomes enum
- `ADR 0025-cancellation-pending-reservation.md` — pending preserves reservation
- `ADR 0026-entitlement-consumption.md` — completed consumes, cancelled does not
- `ADR 0027-no-show-consumption.md` — no-show consumes by default
- `ADR 0028-no-show-grace-period.md` — 15-minute grace
- `ADR 0051-cancellation-decision-record.md` — CancellationDecision approve/deny
- `ADR 0052-reminder-schedule.md` — 24h/2h reminder
- `ADR 0054-outcome-correction-events.md` — correction events
- `ADR 0062-restored-entitlement-expiry.md` — restored expiry
- `ADR 0063-package-refund-at-purchase-level.md` — purchase-level refund
- `ADR 0066-flexible-admin-whatsapp-support.md` — WhatsApp optional
- `ADR 0067-admin-cancellation-refund-workspace.md` — admin workspace
- `ADR 0073-counseling-session-duration.md` — 60-minute session
- `ADR 0077-launch-full-or-no-refund.md` — refund vocabulary
- `ADR 0090-couple-participant-model.md` — couple participant model (compatible)
- `IMPLEMENTATION-GUIDE.md` §6.1, §6.2, §10 — patched alongside this ADR
- `DOMAIN-MODEL.md` Lifecycle section — patched alongside this ADR
- `PRD-GUIDELINE-REVIEW.md` P1-12, TBC-NO-SHOW-01 — closed by this ADR
