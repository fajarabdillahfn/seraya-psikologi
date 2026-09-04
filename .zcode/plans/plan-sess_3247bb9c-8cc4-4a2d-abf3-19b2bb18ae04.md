## Implementation Plan

Scope: Implement all recommendations from the design review. Two parallel tracks:

- **A. Working app code** (`mvp/app/src/*`) — server-rendered behavior, robustness, navigation, accessibility, safety copy, hold flow, booking correctness, dead-route cleanup.
- **B. Design system docs & mock visuals** (`design-system/seraya-psikologi/*`) — coverage of profile detail page, route-corrected CTAs, accessibility artifacts, refreshed research doc with evidence and metrics.

The app code changes are the primary user-visible deliverable; the design system files keep the SPEC and the CODE in sync.

### Workstream A — Application code

#### A1. Authoritative design tokens (single source)

Files: `mvp/app/src/views/index.ts`, `mvp/app/src/views/client-auth.ts`.

- Introduce `:root` tokens in `client-auth.ts` for `--brand, --brand-dark, --warm, --cream, --ink, --muted, --line, --accent, --brand-tint, --accent-tint, --success-tint, --warning-tint, --danger`.
- Change all hardcoded hex literals in `client-auth.ts` to the same semantic tokens used in `views/index.ts`.
- In `views/index.ts`, replace remaining hardcoded `#fafafa`, `#e4f2ed`, `#f8ead0`, `rgba(49,92,87,*)`, `rgba(35,48,46,*)`, `#fff5f0/#e6aa96/#5e3025` (`.crisis`), `#fff8e8/#c48727` (`.warning`), `#eef8f3` (`.success`), `#f3e9d2` literals with variables; map crisis→`--crisis-tint/border/ink`, warning→`--warning-tint/border`, success→`--success-tint`.
- Outcome: a rebrand is now a single `:root` edit; crisis and warning get the same green/orange discipline as success.

#### A2. Accessibility — focus, dropdown semantics, motion

File: `mvp/app/src/views/index.ts`, plus `client-auth.ts` for parity.

- Add a global `:focus-visible { outline: 3px solid var(--brand); outline-offset: 3px; }` and override `outline:none` only on decorative elements (`nav a:hover,nav a:focus-visible { outline:none }` replaced with `background:var(--warm)`; keep focus ring via class).
- The Layanan hover dropdown becomes a real widget. When the user has JavaScript, render `<details><summary>` semantics and progressively enhance — or, simpler: convert to a `<button aria-haspopup="menu" aria-expanded>` plus a small inline script that toggles `aria-expanded` and a wrapper class. Escape closes; outside-click closes; focus returns to trigger. On `prefers-reduced-motion`, drop the transition.

#### A3. Login gate rebalanced

File: `mvp/app/src/worker/index.ts`, `mvp/app/src/views/index.ts`.

- `/book/:offeringId/slots` GET becomes public (no auth guard). Hide book-now CTA when no session.
- Add `POST /book/:offeringId/slots` body `slotId`: this is the action that **requires** auth. If unauthenticated → 302 to `/auth/login?return_to=…`. If profile incomplete → 302 to `/client/profile?return_to=…`.
- The slot list page renders time-zone-converted slots. Each slot exposes a `<form method=post action=/book/:offeringId/slots>` with one hidden `slotId` and a submit button "Pilih slot ini" (44px target). When `auth` is true we know how to render a CTA `Masuk untuk memilih`.

#### A4. Slot hold at selection — idempotent on booking

Files:
- `mvp/app/src/modules/availability.ts`
- `mvp/app/src/modules/booking.ts`
- `mvp/app/src/persistence/adapter.ts` (verify batch support)
- `mvp/app/src/worker/index.ts`
- `mvp/app/migrations/0011_holds_unique_slot.sql` (new)

New SQL:
```sql
-- remove the per-booking-only uniqueness so a slot can be held at most once,
-- and persist a "current reservation kind" on the slot itself.
ALTER TABLE slot_hold DROP INDEX IF EXISTS the_booking_only_unique;
CREATE UNIQUE INDEX IF NOT EXISTS slot_hold_slot_active
  ON slot_hold(slot_id) WHERE state = 'active';
ALTER TABLE availability_slot ADD COLUMN active_hold_id TEXT;
CREATE INDEX IF NOT EXISTS idx_slot_active_hold ON availability_slot(active_hold_id);
```

(New migration `0011_holds_unique_slot.sql`; existing 0010 left intact.)

Changes to `BookingModule`:
- New `createSlotHoldOnly({ clientId, slotId, now }): { slotHoldId, expiresAt, bookingId }` — minimal: client lookup, optional profile-pending path. Uses `INSERT OR IGNORE` semantics so a second POST after hold exists returns the same `slotHoldId`. Inserts a `booking` row in `pending_intake` state (new state added to schema, ADR-backed), `slot_hold`, `capacity_reservation`. `availability_slot.active_hold_id` updated.
- `expireSlotHolds(now)` updated to also null `availability_slot.active_hold_id` and reset booking to `pending_intake` (or a transition state).
- Helpers:
  - `holdExistsForSlot(slotId): Promise<{holding: boolean, expiresAt?: string}>`
  - `releaseHoldForSlot(slotId, { actorClientId }): …` for the cancel path.

`AvailabilityModule.listAvailableSlots` updated to LEFT JOIN the slot_hold and skip slots whose hold is `active` AND `expires_at > now` — i.e. unavailable when held. This **also fixes the latent timestamp-bug** if the SQL is written as `datetime(s.starts_at_utc) > datetime(?)` rather than string compare.

Render change: `renderBookingSlot` now receives `{ psychologistDisplayName, serviceDisplayName, mode, priceIdr, slots, hasSession }` and groups slots by local Jakarta date with human copy like `Sabtu, 12 Sep · 10.00–11.00 WIB`. Drop raw `(WIB)` literal.

#### A5. Profile page (`/psikolog/:id`)

File: `mvp/app/src/views/index.ts`, `mvp/app/src/worker/index.ts`, existing `psychologistProfiles`.

- Fetch display name via `CatalogModule.getPsychologist(id)`; if not present → render a friendly "Profil tidak ditemukan" page.
- Layout:
  - Breadcrumb
  - Profile hero (avatar + name + role + credential line + verified chip **only when data exists**)
  - Three service rows: mode, price, `Cari jadwal` → links to a URL `offering_id` resolved from `CatalogModule.listBookableOfferings(id)`. That logic eliminates the misleading `Cari Jadwal Sesi` → offering list step.
  - `Bingung memilih? Tanya Admin` card alongside the trust row (escape hatch).
- Update `renderFuja` to render with display data plus add a console logger warning when called (the legacy URL is reachable via `/legacy-fuja`).

#### A6. Offering listing `/book` and `renderBookingSlot` correctness

- Resolve psychologist display name in `worker/index.ts` when building the offerings list — pass `{ id, name, mode, priceIdr }` rather than `${display_name} — ${psychologist_id}`.
- `renderBookingOffer` becomes a comparison grid (text-only, no JS) — three cards: Chat / Call / Tatap Muka → each links via `<form method=post action=/book?offeringId=…>` to slot picker. No raw IDs visible to client.

#### A7. `/pulang` retired → reroute to psikolog

File: `mvp/app/src/views/index.ts` and `worker/index.ts`.

- `renderPulang` becomes minimal: explain SERAYA PULANG as "pilih psikolog dulu" CTA: `/psikolog`. Keep `/pulang` route as a server page that 302s (or 308s) to `/psikolog`.
- If you prefer keeping the URL: render a primer that links to `/psikolog`. Either way, the dead `/book/individual-online-single/slots` links (views/index.ts:131,136) are removed.

#### A8. Crisis copy verification

File: `mvp/app/src/views/index.ts:241-260` (`renderCrisisNotice`).

- Drop `Into The Light: 119 ext. 4` (unverified).
- Keep `119 ext. 8 (Kemenkes RI)` with `tel:119` link.
- Add first-class IGD/rumah-sakit guidance inline.
- Add `Nomor admin Seraya: 0812-...` if env var is missing fallback.
- Footer link text updates: "Butuh bantuan segera? → /safety/crisis" already exists; ensure reachability.
- Footer: add "Hotline Kemenkes (119) · IGD terdekat" reference.
- Add a small `<meta name="dcterms.modified" content="2026-09-04">` (or visible "Terakhir diverifikasi 4 September 2026" footer) so we have a date stamp.
- CS: `119 ext. 4` references elsewhere (consent text at views/index.ts:305) trimmed to "hubungi hotline Kemenkes 119 ext. 8" or generic "hotline 119".

#### A9. Lookup of psychology expertise copy

File: `mvp/app/src/worker/index.ts`, `psychologistProfiles[4].expertise` (Kurnia).

- Change `Permasalahan anak` to `Pendampingan orang tua untuk permasalahan anak` to avoid an under-18 collision with the 18+ service boundary.

#### A10. Login CTA copy

Files: `views/index.ts:378` (header), `views/client-auth.ts:7` (login page).

- Header when logged-out: `Masuk` button (outline, secondary highlight) sits beside solid `Booking Sesi`. Already in some mockups; enforce in production views.
- Login page is a single Google sign-in (already supported). Add `return_to` reasoning line: "Kamu akan kembali ke <strong>booking sesi</strong> setelah masuk."

#### A11. Submit feedback for the booking form

Files: `worker/index.ts:298`, `views/index.ts:410`.

- Submit button: progressive enhancement. Inline script attached at intake form bottom (`<script>document.querySelector('form.cta-form').addEventListener('submit',function(e){var b=this.querySelector('button[type=submit]');if(b){b.disabled=true;b.setAttribute('aria-busy','true');b.dataset.label=b.textContent;b.textContent='Memproses...'}})</script>`).
- After successful booking, redirect to `/booking/:bookingId/confirmed` (GET) instead of returning `200 HTML`. Implementation: in `POST /api/booking/create`, after booking succeeds, respond `c.redirect(/booking/${bookingId}/confirmed)`, then add `GET /booking/:bookingId/confirmed` rendering `renderBookingConfirmation`.
- This also fixes the 200-on-POST issue (reloading the confirmation page no longer re-creates the booking).

#### A12. Intake form UX upgrade

File: `mvp/app/src/views/index.ts:378-414` (`renderBookingIntake`).

- Persistent 4-step stepper: Layanan → Jadwal → Data → Bayar (current "Pilih layanan" / "Pilih slot" / "Data Booking" / "Bayar via WhatsApp"). Implement as plain HTML with the existing brand palette.
- Sections:
  1. Tanggal & psikolog recap
  2. Data diri (name, dob, email, phone)
  3. Topik sesi (chips for known topics) + free-text
  4. Persetujuan (crisis ack + consent ack), deliberately split
- Inline validation (server fallback to current behaviour; client mirror added later if needed).
- Countdown timer: render `<span class="hold-chip" data-hold-expires=…>09:42</span>` and a 12-line inline script that updates every second; on expiry, swap copy to "Hold telah kedaluwarsa — pilih ulang slot".
- Crisis experience: improve so if `CLINICAL_BLOCKLIST` triggers, the user is redirected to `/safety/crisis` instead of seeing a 500 stack trace. Wrap `booking.createBooking` in a `DomainError` translator: code `E-CLINICAL-KEYWORD` → 302 to `/safety/crisis?from=booking`.

#### A13. Wizard step consistency

- Header `:root` adds `--step-active: var(--accent)`, `--step-done: var(--brand)`, `--step-pending: var(--line)`.
- A shared server-side helper `renderStepper(currentStep)` is inlined once per page. The 4 steps are string IDs (jasa|jadwal|intake|bayar). Implementation: a single function `renderStepper(currentStep: "jasa"|"jadwal"|"intake"|"bayar"): string` exported from views/index.ts.

#### A14. Input-mode optimization

Files: `views/index.ts` `BASE_STYLES`.

- `input` selectors get `min-height: 44px; min-width: 44px;` for buttons; checkbox rows become 44px hit area; everything has 8px+ gap.
- Aria on existing form: add `aria-label` `Topik` group, `aria-describedby` linking help text.

#### A15. Reduced-motion and accessibility defaults

- `:root` includes `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important } }`.

### Workstream B — Design system docs

#### B1. Refresh `MASTER.md`

- Add new tokens (--accent, --brand-tint, --accent-tint, --success-tint, --warning-tint, --danger, --step-active/done/pending) and an explicit "what's NEW vs previous" block.
- Add a "pre-delivery checklist in 10 lines" map ready for sign-off.

#### B2. Refresh `COMPETITOR-RESEARCH.md`

- Add evidence method block (date accessed, link snippet, confidence: H/M/L).
- Add a "Competitor not in matrix" appendix naming Ceritakan/Fastwork and explaining price-reference role only.
- Add a success-metric table tied to each Section/Route recommendation.

#### B3. Update `preview.html`

- Add `data-board="profile"` (board 10): psychologist detail page with mode-rows + "Tanya Admin" + safety banner.
- Add `data-board="booking-flow"` (board 11): the 4-step persistent stepper rendered against every booking page.
- Update existing CTAs to real Seraya routes: `Lihat jadwal` → `/book`, `Lihat profil` → `/psikolog/<id>` (per profile in worker), `Mulai Konseling` → `/book`, `Booking Sesi` → `/book`, `Profil Saya` → `/client/profile`, `Masuk` → `/auth/login?return_to=…`.
- Add a "Mobile 320–375 px" stress-test board that explicitly tests smallest expected viewport.
- Add `prefers-reduced-motion` indicator in tokens.

#### B4. Render the new boards, regenerate screenshots

Re-render via headless shell so screenshots match the latest preview content; update `shots/`.

### Sequencing for the implementation pass

The implementation order respects dependencies:

1. A1 (tokens) → A2 (a11y) → A11 (submit feedback).
2. A8 (crisis copy) → A9 (psychologist expertise text).
3. A13 (stepper helper) + A14 (input sizing).
4. A3 (login gate on slots POST) + A4 (slot hold at selection) + A6 (offering list fix) — large move; combined commit.
5. A5 (profile page redesign).
6. A12 (intake split-section + countdown).
7. A7 (`/pulang` to `/psikolog`).
8. A10 (header Masuk button).
9. B1–B4 (docs and preview sync).
10. Render screenshots and verify visually.

Run `npx tsc --noEmit` and `npm test` after each milestone in A. Stop on failure; do not proceed unless green.

### What I will NOT do in this pass (deferred)

- Implementing OAuth login. Login still relies on the existing `/auth/google` flow with whatever env config exists.
- Real photos or rate-limiting photos. Profile page will continue to use monogram fallback until photographs are added manually (no auto-generated avatars).
- Building a fancy client-rendered countdown widget. It is a 12-line inline script.
- Introducing `pnpm test` infra. Existing vitest pipeline is preserved.
- Admin workspace polish (Board 09 is direction-card style already; admin remains a parallel concern for a future pass).

### Risks and mitigations

- **A4 introduces a new booking state `pending_intake`.** Confirm by reading `domain/types.ts:183` for the existing allowed values; add `pending_intake` and update the CHECK constraint in `0011` migration. If a stricter code path elsewhere disallows it, we may instead represent the hold as a special `booking.state = 'pending_hold'` parallel to existing `pending_manual_payment`.
- **A11 changes POST → 303 redirect.** Adapter `parseBody` is single-shot; if a downstream consumer relies on inline success HTML, we adapt. Bookings server returns text/html after success today; redirect is a behavior change, but it's the right one for reload-friendliness.
- **Latent timestamp bug fix in A4** could expose a flood of previously-hidden slots on launch. That is desired behavior, not a bug, but flagged for the user.

### Acceptance criteria

A pass is complete when:

- Visiting `/book/:offeringId/slots` while logged-out renders the time-converted slots with `Masuk untuk memilih` on each card.
- Clicking the button while logged-out redirects to `/auth/login?return_to=…`, which on success lands at `/book/.../slots`.
- Clicking the button while logged-in records a `slot_hold` and a `booking` row in `pending_intake` state; `/book/.../intake` shows the live 10-minute countdown.
- Reloading the confirmation URL does not create a second booking.
- Psychologist profile at `/psikolog/fuja` shows three `Cari jadwal` links that go to slot pickers, not to offering list.
- Crisis page lists only `119 ext. 8` and a verified-date stamp.
- New design system docs and preview boards render without console errors, and all screenshots regenerate.

### Files affected (summary)

Code:
- `mvp/app/src/views/index.ts`
- `mvp/app/src/views/client-auth.ts`
- `mvp/app/src/worker/index.ts`
- `mvp/app/src/modules/availability.ts`
- `mvp/app/src/modules/booking.ts`
- `mvp/app/src/modules/catalog.ts`
- `mvp/app/src/domain/types.ts` (state additions if A4)
- `mvp/app/migrations/0011_holds_unique_slot.sql` (new)

Docs:
- `design-system/seraya-psikologi/MASTER.md`
- `design-system/seraya-psikologi/COMPETITOR-RESEARCH.md`
- `design-system/seraya-psikologi/preview.html`
- `design-system/seraya-psikologi/shots/*.png` (regenerated)

No other files outside these paths will be edited.