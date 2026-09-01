# Seraya Psikologi — Booking & Payment MVP

Cloudflare Worker + D1 booking and payment platform for Seraya Psikologi (Malang and Mataram psychological-services bureau).

## What's in this repository

```
.
├── mvp/                          # Cloudflare Worker source code
│   ├── app/
│   │   ├── migrations/0001_init.sql
│   │   └── src/
│   │       ├── worker/index.ts   # Hono router
│   │       ├── modules/          # catalog, availability, booking, payment, admin
│   │       ├── adapters/          # MidtransSnapAdapter (placeholder)
│   │       ├── persistence/       # PersistenceAdapter + D1 driver
│   │       ├── domain/types.ts
│   │       └── views/index.ts     # SSR HTML helpers
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── docs/                         # Source documents
│   ├── IMPLEMENTATION-GUIDE.md
│   ├── DOMAIN-MODEL.md
│   ├── CONTEXT.md
│   ├── PRD-GUIDELINE-REVIEW.md
│   ├── adr/                      # 96 architecture decision records
│   └── snapshots/                # PRD + JSON snapshots
└── docs-site/                    # Browseable HTML docs (open docs-site/index.html)
```

## What is locked (do not re-open without a new ADR)

- **Stack**: Cloudflare Worker + D1 (ADR 0089).
- **Cancellation/refund**: Admin WhatsApp only; `full_refund`/`no_refund` (Round 3, ADR 0077).
- **Capacity**: 30-min grid + symmetric TransitionBuffer (ADR 0091).
- **No-show**: T+15m early checkpoint + 7×24h correction window (ADR 0092).
- **Settlement**: at-most-one settled per Booking + paid_late Option A (ADR 0093).
- **Intake**: Nama + Email + Phone opsional + Consent (ADR 0094).
- **Couple**: BookingParticipant/AppointmentParticipant model (ADR 0090).
- **Package cancellation**: R1–R4 race matrix (ADR 0095).
- **Launch gate**: G-1..G-14 owner-by-role (ADR 0096).

## What is placeholder (production gate, not MVP blocker)

- Authorization: `ALLOW_PLACEHOLDER_ADMIN_AUTH=true` env flag in development; production requires Google SSO + StaffMembership + role check (ADR 0080/0081).
- Payment adapter: `MidtransSnapAdapter` is a stub that throws on non-test calls. Real Midtrans onboarding is TBC-PAY-01.
- Email notifications: tables exist but no provider wired (TBC-NOTIFY-01).
- Crisis/privacy/consent/cancellation copy: placeholder text matches the locked business scope; final wording requires clinical/ethics + legal sign-off.

## Local development

```bash
cd mvp
npm install
npx wrangler d1 migrations apply seraya-db --local
npm run dev
# open http://localhost:8787
```

## Deployment

```bash
cd mvp
npx wrangler login
npx wrangler d1 create seraya-db        # copy database_id into wrangler.toml
npx wrangler d1 migrations apply seraya-db --remote
npx wrangler deploy
```

Run release-gate checklist (ADR 0096 G-1..G-14) before flipping the production switch.

## Browse documentation

Open `docs-site/index.html` in a browser for a navigable HTML version of all source documents and ADR.

## Authority rule

For business-scope conflicts, **Non-Teknis sources** (Charter, Matrix, IA, JSON psikolog) win over technical artifacts. For technical decisions (stack, concurrency, schema), the technical team decides via ADR.

## See also

- `docs/PRD-GUIDELINE-REVIEW.md` — 1,155 lines, Round 1–7 closure narrative.
- `docs/adr/0089.html` ... `docs/adr/0096.html` — Round 4–6 closures.
- `docs-site/index.html` — browseable HTML version.


## Live deployments

- **Static documentation site**: https://seraya-psikologi-docs.pages.dev (Cloudflare Pages, deployed 2026-08-31)
- **MVP Worker**: https://seraya-psikologi.aurinko-jar-ai.workers.dev (Cloudflare Worker + D1)
- **D1 database**: `prd-biro-psikologi` (id `8f193be1-59da-42ba-8ef7-9494cdd18f8c`)

## Deployment steps used

1. Cloudflare Pages project `seraya-psikologi-docs` created via wrangler.
2. Docs site deployed: `wrangler pages deploy docs-site/ --project-name seraya-psikologi-docs`.
3. D1 database already exists as `prd-biro-psikologi` (reused for MVP).
4. Migration applied via `wrangler d1 execute DB --remote --file mvp/app/migrations/0001_init.sql --config wrangler.toml`.
5. Worker deployed via `wrangler deploy --config wrangler.toml` → URL `seraya-psikologi.<account>.workers.dev`.

## GitHub repository

Push this repo to GitHub with:

```
GH_TOKEN=ghp_*** ./scripts/push-to-github.sh
```

The script creates `fajarabdillahfn/seraya-psikologi` via the GitHub API and pushes via SSH.
