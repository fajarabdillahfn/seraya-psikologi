# 89. Single Application Architecture — Cloudflare Worker + D1 with PersistenceAdapter Seam

## Status

Accepted for launch planning. Closes `TBC-STACK-01` (Round 1 P0-01 in `PRD-GUIDELINE-REVIEW.md`).

## Context

`IMPLEMENTATION-GUIDE.md` lines 79, 378, and 499–501 already commit the project to **Cloudflare Worker + D1**, but the live technical PRD JSON still records `database = "supabase"` (`teknis-embedded.json:25`) and `architecture = "docker"` (`teknis-embedded.json:31`). No architecture ADR in `0001–0088` actually ratifies the runtime/database choice. Slice 0 (`migrations/0001_init.sql`, `src/index.ts`) is being built on a Worker with a D1 binding, so an explicit decision is needed before schema, transaction model, migration tooling, backup/restore, and observability assumptions diverge further.

Four candidate stacks were evaluated from the perspectives of cost, latency, transaction model, auth fit, observability, vendor lock-in, operational complexity, and team skill:

| # | Stack | One-line assessment |
|---|---|---|
| 1 | **Cloudflare Worker + D1** | Lowest cost and complexity; sufficient atomicity via D1 batch; matches what the project already runs. |
| 2 | Cloudflare Worker + Postgres (Neon/Supabase) via Hyperdrive | Stronger Postgres primitives (`FOR UPDATE SKIP LOCKED`, advisory locks) at higher cost and an extra vendor to operate. |
| 3 | Supabase (Postgres + RLS + Auth + Storage) | Auth/RLS convenience, but introduces a second runtime vendor and contradicts the already-deployed Worker topology. |
| 4 | Vercel + Vercel Postgres/Neon | Mainstream, but most expensive per GB-second, weakest fit with the existing Worker deploy, and requires a third-party auth layer. |

### Cost

CF Worker + D1 is the cheapest path at MVP scale. The CF Workers Paid plan baseline ($5/month) bundles D1 row reads/writes/storage up to documented quotas, and Workers themselves have a generous free tier. Neon and Supabase both price Postgres compute + storage separately, with Neon free compute hours capped and Supabase Pro starting at $25/month for production. Vercel adds a per-seat/platform fee on top of the same DB cost. For one psychologist, rolling 90-day horizon, and Indonesian traffic, the absolute spend on the chosen stack is the lowest by a meaningful margin.

*Placeholder:* The exact CF D1 quota/pricing snapshot at booking time must be re-verified by Operations before live launch (see Open follow-up `TBC-STACK-OBS-01`). The ADR commits to the architecture, not to a price number.

### Latency

CF Workers run in 300+ cities; D1 has read replicas in the regions where Workers execute. Indonesia-relevant reads (CGK/SIN/HKG/NRT) hit a regional D1 replica in single-digit milliseconds. Writes go to the primary and are serialized — write latency is higher (~30–100 ms intra-region), but the MVP write path is dominated by Midtrans webhook ingestion and Admin actions, not user-typed requests, so this is acceptable. Neon/Supabase in `ap-southeast-1` (Singapore) is comparable (50–100 ms RTT from Jakarta) for reads and writes but lacks edge-replicated reads. Vercel Edge Functions with a default US-East Postgres has the worst Jakarta→DB round-trip and would force an explicit region choice.

### Transaction model

The booking invariants that drive the database choice (per `IMPLEMENTATION-GUIDE.md` §6.2 and §8.2):

- atomic `Booking + SlotHold + verified PaymentEvent → Appointment` (Slice 3);
- atomic `CancellationDecision approve → Appointment cancel + eligible future slot release + valid entitlement restore` (Slice 6, ADR 0051/0062/0076);
- at-most-one successful settlement per Booking/package purchase (P1-10);
- idempotent webhook + retry/reconciliation (TBC-REC-01).

D1 supports atomicity through `db.batch([...statements])` (formerly the D1 session API) inside a single Worker invocation: statements within a batch run in one implicit transaction with SERIALIZABLE-equivalent semantics, with the same durability/visibility guarantees for the row set touched. Combined with a `UNIQUE` index on `(slot_id)` for active `SlotHold`, a state-machine precondition on `Approval`, and an idempotency-key `UNIQUE` index per `PaymentEvent`/`RefundAction`, the booking invariants are satisfied. We do **not** rely on `SELECT ... FOR UPDATE SKIP LOCKED` (Postgres-only); D1's write serialization and the unique constraint make the slot-claim race deterministic without that primitive.

Postgres via Hyperdrive would give us `FOR UPDATE SKIP LOCKED`, advisory locks, partial unique indexes, and `LISTEN/NOTIFY` — all useful at higher scale. None of them are required for MVP traffic and one-psychologist capacity. They are listed as `Open follow-up` migration triggers, not launch blockers.

Supabase RLS would shift authorization enforcement into the database. The application already centralizes authz in `AccessModule` and in each command's precondition check (`IMPLEMENTATION-GUIDE.md` §5.1, §5.2), which is the equivalent enforcement point. RLS is a defense-in-depth option for a later move, not a launch requirement.

### Auth fit

All four candidates require Google SSO for staff and an email-magic-link for guest ClientAccess (`IMPLEMENTATION-GUIDE.md` §3.2–§3.3; ADR 0080). Worker + D1 implements Google ID-token verification in-process via a standard JOSE library, stores StaffMembership/RoleAssignment in D1, and implements ClientAccess (15-min token, 30-min scoped session, resend invalidates) in domain code. Supabase Auth would reduce some boilerplate but couples the auth path to a second vendor and brings its own session-lifetime semantics that would have to be reconciled with the existing ClientAccess vocabulary. Chosen stack keeps auth implementation in one place.

### Observability

CF Workers Logs (with Logpush for long-term retention) and Workers Analytics Engine give request-level logs, custom event counters (e.g. `payment_event.verified`, `slot_hold.expired`), and per-route latency without standing up an external stack. D1 query metrics are surfaced in the Cloudflare dashboard. The chosen stack requires no extra observability vendor; the other three would require adding at least one more (Neon/Supabase dashboards + Workers Logs, or Vercel Observability + DB dashboard).

### Vendor lock-in

D1 is the biggest lock-in risk: the SQL is close to standard SQLite, but D1-specific bindings (e.g. `DB.prepare(...).bind(...)`), session/batch API, and Cloudflare-side operational tooling are not directly portable. Postgres (Neon/Supabase/Vercel) is more portable at the schema level but ties the project to a different runtime vendor.

**Mitigation:** all persistence operations must go through one in-process `PersistenceAdapter` interface (`query`, `batch`, `tx`) implemented by a D1 driver today. A future move to Postgres rewrites the adapter implementation, not the domain modules. This seam is part of the Decision below and is required even though no second backend is shipping at launch.

### Operational complexity

CF Worker + D1 has a single deploy unit (the Worker, with a D1 binding) plus migrations run via `wrangler`. Local dev uses `wrangler dev` and `wrangler d1 execute --local`, with Miniflare providing in-process emulation for Vitest. No Docker, no second runtime, no cross-vendor networking policy. Neon/Supabase add a Postgres endpoint that must be reachable from Workers (Hyperdrive cache for CF Worker+Postgres; direct connection from Vercel), plus a separate dashboard and credential set. Supabase adds an Auth service. Vercel adds platform-user accounts and per-function/edge config.

### Team skill and existing investment

The project already ships a Worker that writes to D1 (the autosave PRD form backend at `src/index.ts:138–148` uses a D1 binding; `migrations/0001_init.sql` is the existing schema). Switching stack means throwing away a working pipeline and rebuilding local-dev, CI/CD, secrets handling, and the schema baseline. The chosen stack reuses all of it.

## Decision

Seraya Psikologi MVP runs on **Cloudflare Workers** with **Cloudflare D1** as the primary data store, fronted by an in-process **PersistenceAdapter** seam so the runtime can be re-targeted at Postgres later without changing domain modules.

1. **Runtime:** Cloudflare Workers (TypeScript, Node-compatible APIs via the `nodejs_compat` flag where needed).
2. **Database:** Cloudflare D1 — a single regional primary plus global read replicas.
3. **Schema and migrations:** `migrations/NNNN_*.sql` files applied through `wrangler d1 migrations apply`; reversible by pairing forward migrations with explicit down scripts where safe. Destructive migrations require an audited redaction/retention check before applying in production (per ADR 0083–0087).
4. **Transaction primitive:** the D1 batch API (`db.batch([...])`) inside one Worker invocation, used for any command whose atomicity spans multiple rows (`ApplyVerifiedPaymentEvent`, `DecideCancellation` approve, `ConsumeEntitlement`, `RestoreEntitlement`, `ExecuteRefundAction`, `AssignOrRevokeStaffMembership`). Single-statement commands use a typed `query`. There is no explicit `BEGIN/COMMIT` user transaction in MVP.
5. **Concurrency enforcement:** UNIQUE index on `slot_hold(slot_id) WHERE state = 'active'` plus state-machine precondition in the `UPDATE` (`WHERE state = ? AND expires_at > ?`). Duplicate webhook prevention: UNIQUE on `payment_event(provider_event_id)`. Idempotency key on each domain command (`command_id`/`correlation_id`).
6. **PersistenceAdapter seam:** every module that touches the database does so through a `PersistenceAdapter` interface declared in `src/persistence/adapter.ts`, with the D1 implementation in `src/persistence/d1-adapter.ts`. Domain modules (`BookingModule`, `PaymentModule`, `CancellationModule`, etc.) never import from `@cloudflare/workers-types` or call `env.DB.prepare(...)` directly. This is a code-review gate, not just a convention.
7. **Local development and tests:** `wrangler dev` for the Worker, `wrangler d1 execute --local` for ad-hoc queries, Vitest + Miniflare for unit and integration tests. The D1 local binding is used as the test database; no separate Postgres or SQLite-server dependency is introduced.
8. **Backup/restore:** Cloudflare-managed daily backups are the baseline (Workers Paid plan includes D1 backup history per CF docs; the exact retention value is a `TBC-STACK-OBS-01` verification item). Pre-destructive migrations and pre-launch snapshots are exported with `wrangler d1 export` and stored in the operations vault with the same retention rules as Payment/Refund records (ADR 0084). Restore drill is required before production launch and quarterly thereafter.
9. **Observability:** CF Workers Logs (Logpush to long-term storage), Workers Analytics Engine for domain-event counters (`slot_hold.created`, `payment_event.verified`, `cancellation_decision.recorded`, `refund_action.recorded`, `staff_membership.changed`), and CF dashboard D1 metrics for query latency and error rate. Application logs must not write clinical or contact fields (P1-11); the audit writer remains the source of truth for privileged-action history.
10. **Secrets:** CF Workers Secrets (encrypted at rest, injected at runtime) hold Midtrans server key, Google OAuth client secret, email provider key, and any inter-service signing keys. No secret is written to PRD artifacts, code, or the Obsidian vault.
11. **Migration path if scale or feature parity forces Postgres later:** implement a second `PostgresAdapter` behind the same `PersistenceAdapter` interface, run dual-write shadow mode for one release, switch reads, then remove D1. Triggers for opening this work: D1 write-throughput saturation, need for `FOR UPDATE SKIP LOCKED`, need for `LISTEN/NOTIFY`, or a multi-region write requirement.

## Consequences

Positive:

- Aligns with the already-deployed Worker + D1 autosave pipeline (`src/index.ts`, `migrations/0001_init.sql`); no infrastructure rebuild.
- Single-vendor operational surface — one deploy, one dashboard, one secrets store, one log pipeline.
- Lowest cost at MVP scale (one psychologist, rolling 90-day horizon, ID traffic).
- D1 batch atomicity satisfies the booking/cancellation/package invariants without a hand-rolled transaction manager.
- `PersistenceAdapter` seam keeps domain modules portable and makes a future Postgres migration bounded.
- Observability is built into the platform; no extra vendor on day one.

Costs and constraints:

- No `FOR UPDATE SKIP LOCKED`; concurrency relies on D1 write serialization + UNIQUE constraints + state-machine preconditions. This is acceptable at MVP and is documented in code comments at each contended write site.
- No database-enforced RLS; authorization is enforced centrally in `AccessModule` and at each command's precondition. Two-Admin recovery (ADR 0081) and `StaffMembership` audit (ADR 0080) are mandatory compensating controls.
- D1 SQL is close to SQLite standard but uses the CF binding API; portability to another runtime requires the adapter seam to be honored.
- Backup/restore cadence and pricing snapshot depend on CF plan tier at launch and must be verified before live traffic (Open follow-up `TBC-STACK-OBS-01`).
- Single regional primary for writes means D1 is not the right fit if/when Seraya requires multi-region active-active writes — that case is the explicit migration trigger above.

## Open follow-up

- `TBC-STACK-OBS-01` — Operations to confirm CF Workers Paid plan tier, D1 included quotas, daily-backup retention, and Logpush retention at launch-time. Replace the placeholder pricing line in this ADR with the verified snapshot before go-live.
- `TBC-STACK-OBS-02` — Run a restore drill against a staging D1 instance before production launch; record RPO and RTO evidence in the production preflight checklist.
- `TBC-STACK-OBS-03` — Confirm the `PersistenceAdapter` interface is the only call path to D1 from domain modules via a CI lint (forbid imports of `@cloudflare/workers-types` `D1Database` outside `src/persistence/`).
- `TBC-STACK-OBS-04` — Document the migration triggers (write saturation, need for advisory locks, multi-region writes) in the runbook so the decision to leave D1 is data-driven, not speculative.
- This ADR does **not** change PRD answer-store values; the technical PRD JSON `database` and `architecture` fields are reconciled by a separate content-patch ticket, not by an architecture rewrite.

---

## Ringkasan eksekutif (Bahasa Indonesia)

**Keputusan:** Seraya Psikologi MVP berjalan di atas **Cloudflare Worker + Cloudflare D1**, dibungkus oleh satu interface `PersistenceAdapter` agar domain module tidak bergantung langsung ke driver D1.

**Alasan satu baris:** stack ini sudah berjalan (Worker + D1 dipakai autosave PRD), paling murah untuk skala MVP (satu psikolog, horizon 90 hari, trafik Indonesia), dan atomicity `db.batch` D1 cukup untuk invariant booking+cancellation+package yang wajib atomic.

**Perspektif yang dibandingkan:**

- *Biaya:* CF+D1 termurah; Neon/Supabase/Vercel tambah komponen mahal.
- *Latency:* CF+D1 punya read-replica regional (SIN/HKG/NRT) yang menang untuk visitor Indonesia; Postgres managed dari US-East paling jelek.
- *Transaksi:* D1 batch + UNIQUE constraint + state precondition sudah memenuhi invariant; `FOR UPDATE SKIP LOCKED` (Postgres) tidak dibutuhkan di MVP.
- *Auth:* semua kandidat tetap perlu Google SSO + ClientAccess magic link; Supabase Auth sedikit memangkas kode tapi menambah vendor baru.
- *Observability:* CF Logs + Workers Analytics Engine built-in; kandidat lain butuh dashboard kedua.
- *Vendor lock-in:* D1 adalah lock-in terbesar; dimitigasi dengan `PersistenceAdapter` seam agar migrasi ke Postgres nanti cukup rewrite adapter, bukan domain.
- *Kompleksitas:* CF+D1 = satu deploy, satu secrets store, satu log pipeline; paling sederhana.
- *Skill & investasi tim:* pipeline Worker+D1 sudah jalan di repo (`src/index.ts`, `migrations/0001_init.sql`); pindah stack berarti buang investasi itu.

**Yang dijawab ADR ini:** runtime (Worker), database (D1), transaction primitive (`db.batch` + UNIQUE + state precondition), migration path (`wrangler d1 migrations` + `wrangler d1 export` snapshot sebelum destructive change), backup/restore (managed daily backup baseline + restore drill pra-launch), local test DB (`wrangler dev` + `wrangler d1 execute --local` + Miniflare/Vitest), biaya (placeholder diverifikasi Operations; arsitektur tidak tergantung angka), observability (Logs + Logpush + Analytics Engine + D1 metrics), dan alasan tegas memilih ini.

**Trade-off yang diterima:** tanpa `FOR UPDATE SKIP LOCKED`, tanpa RLS di level database, write primary single-region. Ketiganya adalah trigger migrasi ke Postgres, bukan blocker launch — dan `PersistenceAdapter` seam membuat migrasi itu bounded.

**Risiko residual:** konfigurasi CF/D1 aktual (quota, retention backup, harga) belum diverifikasi saat ADR ditulis; harus dicek Operations sebelum go-live dan dicatat di `TBC-STACK-OBS-01`. CI lint untuk memaksa semua akses DB lewat `PersistenceAdapter` juga belum dipasang (`TBC-STACK-OBS-03`).
