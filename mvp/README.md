# MVP Limitations and Production Gate

> Status: **MVP skeleton code** — **not production ready**. This document lists every limitation the user must address before flipping the production switch.

> Per user instruction (2026-08-31): authorization, payment integration, and any other live-service dependency are placeholder. They are not blockers for the MVP skeleton because the business scope and architecture are locked; they are blockers for **production traffic**.

## 1. Architecture and persistence (locked by ADR 0089)

- **Runtime**: Cloudflare Worker (TypeScript, `nodejs_compat`).
- **Database**: Cloudflare D1 (single regional primary + global read replicas).
- **PersistenceAdapter**: single seam in `app/src/persistence/adapter.ts`; D1 implementation in `d1-adapter.ts`. Future Postgres rewrite touches only the adapter.

To deploy:
1. `wrangler d1 create seraya-db` → copy `database_id` into `wrangler.toml`.
2. `wrangler d1 migrations apply seraya-db --remote`.
3. `wrangler deploy`.

Migrations are in `app/migrations/0001_init.sql`, `0002_whatsapp_payment.sql`, and `0003_booking_state_whatsapp.sql`.

## 2. Authorization (placeholder, per user instruction)

- **Public routes**: `/`, `/pulang`, `/about`, `/fuja`, `/faq`, `/safety/crisis`, `/privacy`, `/consent`, `/cancellation`, `/book/*` — open to all.
- **Admin routes**: `/admin/*` are gated behind `ALLOW_PLACEHOLDER_ADMIN_AUTH=true` env flag. **Production must remove this flag** and integrate:
  - Google SSO verification per ADR 0080 (`google_subject` claim → StaffMembership lookup).
  - StaffMembership bootstrap with two Admin per ADR 0081.
  - Role check per ADR 0079 (`admin` / `psychologist`).
  - Two-Admin invariant for staff invite/revoke (TBC-STAFF-SESSION-01).

## 3. Payment integration (WhatsApp manual, ADR 0097)

The payment flow is **manual, Admin-verified** — no automated payment gateway is in scope for the MVP.

- After booking intake, `booking.state = 'pending_manual_payment'`.
- The Worker renders a confirmation page with:
  - Downloadable **invoice PDF** (`/api/booking/:id/invoice.pdf`)
  - Plain-text invoice (`/api/booking/:id/invoice.txt`)
  - A WhatsApp deep-link (`https://wa.me/<ADMIN_NUMBER>?text=...`) the client taps to send the proof.
  - The Admin's WhatsApp number (set via `ADMIN_WHATSAPP_NUMBER` var).
- The client pays via bank transfer or QRIS, then sends the screenshot/slip to Admin on WhatsApp.
- Admin opens `/admin/payments`, reviews each `payment_proof`, and either:
  - **verify** (`/api/payment/manual/verify` with `status=verified`) → atomic flip of `payment_proof.status='verified'` AND `booking.state='confirmed'`.
  - **reject** (`status=rejected`) → records the rejection reason; the booking is not confirmed. Cancellation/expiry is handled by its own Admin command.

Both transitions are **idempotent** (re-applying the same terminal status is a no-op) and **atomic** (single `db.batch`).

Key files:
- `app/src/modules/payment.ts` — `WhatsAppManualPaymentModule` (generator, recordPayment, verifyPayment, listPendingPayments).
- `app/src/modules/admin.ts` — `markAsPaid`, `rejectPayment`, `listPendingPayments`.
- `app/src/modules/booking.ts` — `confirmPayment` for the booking-side state flip.
- `app/migrations/0002_whatsapp_payment.sql` — `payment_proof` table schema.
- `app/migrations/0003_booking_state_whatsapp.sql` — booking state constraint update.

### Pre-ADR 0097 (legacy Midtrans path, removed)

The previous `app/src/adapters/midtrans-snap.ts` (placeholder Midtrans Snap adapter) and the `payment` table webhook flow (`/api/payment/notification`, `applyVerifiedPaymentEvent`, `executeRefundAction`) have been **removed entirely**. The legacy gateway tables are removed by migration 0002. New bookings go through `payment_proof` only; Admin legacy refund/read paths are tracked on `docs/WORKBOARD.md` until reconciled.

## 4. Notification and email (placeholder)

- The Worker does not call any email provider in this skeleton.
- `Notification` and `DeliveryAttempt` tables exist in the migration; the Worker just inserts rows. TBC-NOTIFY-01 covers provider integration.

## 5. Content/CMS (placeholder)

- `ContentEntry` and `ContentRevision` tables exist; Admin CMS is not implemented.
- Public pages render from inline views in `app/src/views/index.ts`. Move content to `content_entry` rows before launch.

## 6. Crisis, privacy, consent, cancellation copy (placeholder wording)

- All public-facing copy for `/safety/crisis`, `/privacy`, `/consent`, `/cancellation` is a **placeholder** intended to match the locked business scope. Final wording requires:
  - Clinical/ethics sign-off (TBC-CONSENT-01).
  - Privacy review (TBC-PRIVACY-01).
  - Legal review for terms of service and refund policy.

## 7. Couple booking (launch-deferred pending ADR 0090)

- The couple package is **modeled** end-to-end (`BookingParticipant`, `AppointmentParticipant`, `joint_attendees`), but the public page surfaces a "coming soon" badge.
- To launch couple booking: complete TBC-COUPLE-LAUNCH-01 (additional clinical/ethics sign-off on joint-session consent wording, and Admin workspace support for couple-package cancellation).

## 8. What is locked (do not re-open without a new ADR)

| Decision | ADR | Authority |
|---|---|---|
| Stack: Cloudflare Worker + D1 | ADR 0089 | Locked |
| Cancellation/refund handled by Admin WhatsApp only | Round 3 + ADR 0076/0077 | Locked |
| Refund outcomes only `full_refund` / `no_refund` | ADR 0077/0093 | Locked |
| Capacity grid 30 min, symmetric TransitionBuffer | ADR 0091 | Locked |
| No-show early checkpoint T+15m, correction window 7×24h | ADR 0092 | Locked |
| At-most-one settled Payment per Booking | ADR 0093 | Locked |
| Intake: Nama + Email + optional Phone + Consent | ADR 0094 | Locked |
| Couple BookingParticipant/AppointmentParticipant | ADR 0090 | Locked |
| Package cancellation matrix R1–R4 | ADR 0095 | Locked |
| Launch gate G-1..G-14 with owners | ADR 0096 | Locked |

## 9. What is **operational** (must be done before production, but not architecture changes)

1. **Staff bootstrap**: record two Admin StaffMemberships per ADR 0081.
2. **Profile evidence**: verify Fuja's STR/SILP and obtain publication consent.
5. **Real availability**: replace `anytime/anyplace` placeholder with Fuja's recurring schedule and offline venue (TBC-SCHEDULE-01).
6. **Approved consent/privacy copy**: clinical/ethics sign-off on the placeholder text in `app/src/views/index.ts`.
7. **WhatsApp payment onboarding**: confirm Admin WhatsApp number, bank account details, and QRIS image URL are set in `wrangler.toml` `[vars]` (TBC-PAY-01 replaced by ADR 0097 manual flow).
8. **Email provider**: choose provider, set sender domain, and write template copy (TBC-NOTIFY-01).
9. **Backup/restore drill**: pre-launch snapshot export via `wrangler d1 export`; restore drill.
10. **Runbook**: cancellation handling, WhatsApp payment verification turnaround, refund failure recovery.

Each gate G-1..G-14 in ADR 0096 maps to one of the above.

## 10. Folder layout

```
seraya-psikologi-mvp/
├── package.json                # Worker + Hono + Vitest + wrangler
├── wrangler.toml               # CF Worker + D1 binding (PLACEHOLDER db_id)
├── tsconfig.json
├── README.md                   # (this file)
├── app/
│   ├── migrations/
│   │   └── 0001_init.sql       # D1 schema baseline (post ADR 0089–0095)
│   ├── public/
│   │   └── (placeholder, Worker serves inline CSS)
│   └── src/
│       ├── worker/index.ts     # Hono router; public + booking + admin + webhook
│   │   ├── modules/            # catalog, availability, booking, payment, admin
│   │   ├── adapters/           # (legacy Midtrans adapter removed per ADR 0097)
│   │   ├── persistence/        # PersistenceAdapter + D1 driver
│   │   ├── domain/types.ts     # shared vocabulary
│   │   └── views/index.ts      # SSR HTML helpers
│   └── migrations/
│       ├── 0001_init.sql       # D1 schema baseline (post ADR 0089–0095)
│       └── 0002_payment_proof.sql # payment_proof table (ADR 0097)
└── tests/
    ├── unit/                   # (empty; place pure-policy tests here)
    └── integration/            # (empty; place D1/Miniflare tests here)
```

## 11. How to run locally

1. Install deps: `pnpm install` (or `npm install`).
2. Apply migrations: `pnpm migrate:local`.
3. Start Worker: `pnpm dev`. Open `http://localhost:8787`.
4. Admin (placeholder): set `ALLOW_PLACEHOLDER_ADMIN_AUTH=true` in `.dev.vars`, then visit `/admin`.

Local DB is a fresh D1 binding. Demo seed data can be created with `../scripts/seed-d1.sh` (remote/local target). Demo values are not production evidence.

## 12. Verification artifacts (already produced)

- `docs/adr/0089–0096` — eight ADRs covering all top-priority ticket closures.
- `docs/IMPLEMENTATION-GUIDE.md`, `docs/DOMAIN-MODEL.md`, `docs/CONTEXT.md` — patched and consistent with the ADRs.
- `docs/PRD-GUIDELINE-REVIEW.md` — 1,075 lines, Round 1–6 closure summary.
- `output/seraya-psikologi-prd-review-001.zip` — review bundle (125 members, 96 ADR, MVP skeleton files).