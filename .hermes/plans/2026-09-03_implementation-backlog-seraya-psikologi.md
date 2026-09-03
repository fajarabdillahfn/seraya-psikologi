# N10 — Implementation Backlog

> PLANNING ONLY. No file modification, migration, deployment, or code execution is authorized before N11 approval and explicit user instruction to resume implementation.

**Goal:** Translate the closed business PRDs into small implementation slices with dependencies, UI/UX checkpoints, and acceptance tests.

**Architecture:** Keep Cloudflare Worker + Hono + D1 and the `PersistenceAdapter` seam. Work incrementally; do not replace the current MVP wholesale. Preserve manual WhatsApp payment and the approved customer-data boundary.

**Tech stack:** TypeScript, Hono, Cloudflare Worker, D1/SQLite, server-rendered views, existing tests and smoke tests.

## Non-negotiable constraints

- Google SSO required; no guest booking.
- All approved profile/address and counseling-intake fields required.
- Individual counseling only.
- Online: Chat Rp99.000, Call Rp125.000.
- Offline: Rp200.000 at Havana Park, 09.00–12.00 and 16.00–20.00 WIB.
- Booking cutoff: 2 hours; session 60 minutes; 15-minute buffer.
- Buffer-aware slot starts; public holidays closed; Monday–Sunday schedule.
- Client cancellation/refund via Admin WhatsApp only.
- Official invoice only after Admin payment verification.
- Psychologist receives only scoped confirmed-booking operational context.
- Intake narratives never enter the financial invoice.
- No clinical notes, diagnosis, assessment results, transcripts, or treatment notes.

## Dependency map

```text
S01 baseline/test seams
  → S02 client profile + S03 auth
  → S04 public website/catalog
  → S05 availability + staff foundation
  → S06 booking/intake
  → S07 payment/Admin
  → S08 cancellation/refund/reschedule
  → S09 psychologist scope + staff hardening
  → S10 privacy/copy
  → S11 UAT/checklist
```

The staff foundation is deliberately available before payment and cancellation actions because those actions require `StaffMembership`, role checks, and `actor_membership_id`.

## Slices

### S01 — Freeze baseline and establish test seams

**Purpose:** Record the actual baseline before behavior changes.

**Files:** inspect `mvp/app/src/`, `mvp/app/migrations/`, `mvp/tests/`, `mvp/package.json`, `mvp/scripts/smoke-test.sh`.

**Acceptance:** known typecheck/build/test commands; remote smoke baseline recorded without changing production data; demo fixtures distinguished from production.

**Test seams:** frozen clock/fake timer, mock D1 adapter, test auth injection, mock evidence storage. These seams must be agreed before tests are written.

**Dependency:** none.

### S02 — Client account and profile data

**Purpose:** Store Google identity separately from user-provided Nama Panggilan and persist all approved required profile/address fields.

**Likely files:** `mvp/app/migrations/0004_client_profile.sql`, `mvp/app/src/domain/types.ts`, `mvp/app/src/persistence/adapter.ts`, `mvp/app/src/persistence/d1-adapter.ts`, `mvp/app/src/modules/client.ts`.

**Acceptance:** incomplete profile blocks booking; client can read/update only their own profile; fields have explicit purpose/privacy mapping; no extra fields added.

**Test seam:** `MockAuthProvider` identity + client ownership fixture.

**Dependency:** S01.

### S03 — Google SSO client login gate

**Purpose:** Make authenticated identity mandatory for booking.

**Likely files:** `mvp/app/src/modules/auth.ts`, `mvp/app/src/worker/index.ts`, `mvp/app/src/views/index.ts`, `mvp/wrangler.toml`.

**Acceptance:** anonymous user sees Google login; callback binds identity; cancellation/replay/error cannot submit; no guest path; session ownership prevents cross-client access.

**Test seam:** local `MockAuthProvider`/session injection; no external Google OAuth in automated tests.

**Dependency:** S02.

### S04 — Public website, navigation, and catalog

**Purpose:** Apply PRD-03 and catalog decisions to public pages.

**Likely files:** `mvp/app/src/modules/catalog.ts`, `mvp/app/src/views/index.ts`, content/assets directories.

**Acceptance:** Beranda, Layanan, List Psikolog, About, FAQ; Layanan hover/focus submenu contains four programs; only individual counseling is bookable; Chat/Call/offline labels and prices correct; 100% Bahasa Indonesia; placeholders clearly marked; 360px mobile layout.

**UI/UX checkpoint A:** design public navigation, submenu, psychologist card, FAQ interaction, and placeholder asset treatment before implementation.

**Dependency:** S01; S02/S03 only if login CTA is included in this slice.

### S05 — Availability, buffer, holidays, and staff foundation

**Purpose:** Generate valid slots and establish the staff membership foundation required by Admin actions.

**Likely files:** `mvp/app/src/modules/availability.ts`, `mvp/app/src/modules/auth.ts`, `mvp/app/src/persistence/*`, `mvp/app/migrations/0005_staff_membership_availability.sql`, `mvp/app/src/views/index.ts`.

**Acceptance:** Monday–Sunday; public holidays and exceptions closed; windows 09.00–12.00 and 16.00–20.00 WIB; 60-minute sessions; 15-minute buffer-aware starts; 2-hour cutoff; same grid online/offline; overlap/expiry safe; `StaffMembership` supports one Superadmin, Admin, Psychologist.

**UI/UX checkpoint B:** design slot list, closed-day state, empty state, cutoff message, and Admin holiday/withdrawal calendar.

**Test seam:** frozen clock, deterministic holiday calendar, concurrency fixture.

**Dependency:** S01, S03.

### S06 — Required booking and intake form

**Purpose:** Enforce PRD-01 profile/intake contract in the booking flow.

**Likely files:** `mvp/app/src/modules/booking.ts`, `mvp/app/src/views/index.ts`, `mvp/app/src/domain/types.ts`, migration if needed.

**Acceptance:** all profile/address and intake fields required; topics multi-select; problem description minimum 50 and max bounded; consent version stored; no clinical fields; OfferSnapshot/hold/reservation atomic.

**UI/UX checkpoint C:** design profile completion, grouped address fields, intake form, validation, consent, loading, error, and confirmation states.

**Dependency:** S02, S03, S04, S05.

### S07 — Manual payment and post-verification invoice

**Purpose:** Implement PRD-02 with correct invoice ordering.

**Likely files:** `mvp/app/src/modules/payment.ts`, `mvp/app/src/modules/admin.ts`, `mvp/app/src/views/index.ts`, payment migration.

**Acceptance:** pre-verification view has preliminary instructions + WhatsApp link only; Admin records proof and checks bank/QRIS; verify/reject in dashboard; official PDF/text invoice only after verification; invoice excludes intake narratives; underpayment top-up; overpayment return evidence; B04 legacy `payment`/`refund_action` queries removed or reconciled to current schema.

**UI/UX checkpoint D:** design preliminary payment, pending state, rejection, underpayment, overpayment, verified invoice, and client confirmation states.

**Test seam:** mock evidence storage, fake clock, payment proof fixtures.

**Dependency:** S05 staff foundation, S06, S04.

### S08 — Cancellation, refund, and Admin reschedule workflow

**Purpose:** Implement PRD-05 and the PRD-04 online↔offline change rule.

**Likely files:** `mvp/app/src/modules/admin.ts`, `mvp/app/src/modules/booking.ts`, `mvp/app/src/views/index.ts`, cancellation/refund/reschedule migration.

**Acceptance:** no public mutation endpoint; trigger is `client_requested` or `psychologist_unavailable`; required evidence matches trigger; statuses and audit work; refund completion requires transfer proof; Admin-mediated mode change creates `RescheduleAction` and updated OfferSnapshot; slot/capacity release follows rules; idempotent transitions.

**UI/UX checkpoint E:** design cancellation/refund queue, evidence upload, status history, provider-unavailable action, and reschedule adjustment.

**Test seam:** mock evidence storage + state-machine fixtures.

**Dependency:** S05 staff foundation, S07, S06.

### S09 — Staff authorization and scoped psychologist view

**Purpose:** Complete role enforcement and customer-data whitelist.

**Likely files:** `mvp/app/src/modules/auth.ts`, `mvp/app/src/modules/admin.ts`, `mvp/app/src/views/index.ts`, staff migration.

**Acceptance:** one Superadmin; Admin; Psychologist; Google SSO + StaffMembership; placeholder auth disabled in production; psychologist receives only display name, WhatsApp, mode, slot, topics, non-clinical description, expected outcome, returning-client flag; excludes full address, religion, occupation, education, payment evidence; sharing audit includes actor, timestamp, booking, fields shared; last-admin/superadmin protections.

**UI/UX checkpoint F:** design scoped psychologist view and visibly separate Admin/Superadmin capabilities.

**Test seam:** role matrix fixture, mock auth, audit assertion.

**Dependency:** S03, S05, S07, S08.

### S10 — Privacy, rights, copy, and operational hardening

**Purpose:** Apply PRD-06/07/08 to real routes and messages.

**Likely files:** `mvp/app/src/views/index.ts`, `mvp/app/src/worker/index.ts`, `mvp/README.md`, content assets.

**Acceptance:** Terms contains WhatsApp cancellation/refund rule; privacy/consent/safety placeholders clearly marked until replaced; client rights route to email; breach notice route exists; no marketing; error/log redaction; footer/FAQ/booking links work.

**Dependency:** S03, S06–S09.

### S11 — UAT and lightweight launch checklist

**Purpose:** Execute PRD-08 without enterprise ceremony.

**Likely files:** `docs/prd/08-launch-gates.md`, `mvp/scripts/smoke-test.sh`, `mvp/README.md`.

**Acceptance:** A–G checklist distinguishes demo from real; e2e covers login → profile → booking → transfer proof → Admin verify → invoice → confirmation; blockers remain unchecked without evidence; sign-off records date/maintainer/open items.

**Dependency:** S01–S10.

## UI/UX sequence

UI/UX is not last. It happens at each checkpoint:

1. Public website/navigation — before S04.
2. Slot selection and calendar — before S05.
3. Profile/intake — before S06.
4. Payment confirmation/invoice — before S07.
5. Admin cancellation/payment queues — before S08.
6. Psychologist scoped view — before S09.

Each design checkpoint must include a small wireframe/prototype, mobile review, states, and mapping to PRD acceptance criteria. Do not design deferred features.

## N11 approval checklist

Before implementation begins:

- [ ] Confirm this slice order and dependencies.
- [ ] Confirm S01–S03 auth/test seams.
- [ ] Confirm fixed buffer-aware start examples in S05.
- [ ] Confirm invoice does not contain intake narratives.
- [ ] Confirm B04 legacy Admin query cleanup is part of S07/S08.
- [ ] Confirm evidence storage seam.
- [ ] Confirm provider-unavailable cancellation path.
- [ ] Confirm psychologist whitelist and sharing audit.
- [ ] Confirm which UI/UX checkpoint is designed first.
- [ ] Explicitly authorize N12 resume implementation.

Until all relevant items are reviewed and the final authorization is given, this remains a planning artifact only.
