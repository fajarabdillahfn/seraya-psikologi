# Seraya Psikologi — Workboard

> Lightweight Kanban. This is the current project-control document. Move an item only when the stated evidence exists.

Last reviewed: 2026-09-02

## DONE — verified

- **D01 — Project documentation is organized** — this control center, small PRDs, and reference links exist.
- **D02 — Public docs site is live** — Cloudflare Pages deployment responds successfully.
- **D03 — Public MVP pages are live** — home, SERAYA PULANG, Fuja, FAQ, safety, privacy, consent, cancellation, and booking pages respond successfully.
- **D04 — Booking happy path works** — a valid client + offer + future slot creates a booking in `pending_manual_payment` and creates the hold/reservation.
- **D05 — Manual payment handoff works** — confirmation page provides text invoice, PDF invoice, and WhatsApp deep-link.
- **D06 — D1 demo data exists** — Fuja, two offerings, weekday demo slots, and a placeholder staff row are seeded.
- **D07 — GitHub repository is pushed** — source and generated docs are in `fajarabdillahfn/seraya-psikologi`.
- **D08 — Domain decisions are recorded** — booking, capacity, intake, no-show, cancellation, and payment decisions are documented in ADRs 0089–0097.
- **D10 — Documentation refactor published** — overview + kanban + focused PRDs + reference archive.
- **D11 — PRD 01 business review closed** — profile/address fields, counseling intake, individual-only scope, online prices, offline price/schedule/venue, cutoff, and labels are approved. Implementation is intentionally deferred.

## DOING — current focus

- **W02 — PRD 02 Payment Flow review** — review the manual WhatsApp payment flow before any implementation changes.

Implementation of PRD 01 is deferred until the PRD review sequence is complete and implementation is explicitly resumed.

The documentation refactor is complete: this board and the focused PRDs are now the default reading path.

## NEXT — ordered

- **N01 — Business review of focused PRDs** — review `prd/01` through `prd/08`, starting with Booking and Payment.
- **N02 — Replace demo payment configuration** — confirm real bank account, account holder, QRIS asset, and Admin procedure.
- **N03 — Configure approved schedule** — replace demo slots with 09.00–12.00 and 16.00–20.00 WIB; venue Havana Park.
- **N04 — Finalize session instructions** — define online Chat/Call access, offline arrival/check-in, and late/access-failure instructions.
- **N05 — Finalize public copy** — clinical/ethics + privacy/legal review.
- **N06 — Define production staff access** — Google SSO, StaffMembership, roles, session/CSRF/revocation.
- **N07 — Define Admin operations** — payment proof, dispute, cancellation/refund, evidence retention.
- **N08 — Wire email** — provider, sender domain, templates, bounce handling, ClientAccess delivery.
- **N09 — Run UAT and launch gates** — execute `prd/08-launch-gates.md` and record evidence.

## BLOCKED / production gate

- **B01 — Production launch** — blocked by real staff authentication, approved copy, real payment instructions, real availability, email delivery, backup/restore evidence, and UAT sign-off.
- **B02 — Couple launch** — blocked by the explicit business decision: launch-ready or keep “coming soon”. The data model exists; the launch decision does not.
- **B03 — Real Admin payment verification** — blocked until Admin auth and real bank/QRIS configuration are available.
- **B04 — Legacy Admin read paths** — current Admin detail/refund helpers still contain queries for legacy `payment`/`refund_action` tables removed by the manual-payment migration; must be reconciled before those Admin actions are considered working.

## DEFERRED — intentional

- **F01 — Midtrans/payment gateway** — post-MVP option; do not implement until the team reopens the payment decision.
- **F02 — Couple bookable checkout** — modeled but not in the current launch path.
- **F03 — CMS/editor workflow** — current public pages use code-backed content.
- **F04 — Clinical record / EMR** — outside this product.
- **F05 — Automated WhatsApp provider** — WhatsApp remains a manual human channel.

## Working rules

- One active item at a time for the product owner review.
- A decision belongs in the smallest relevant PRD; an enduring technical choice belongs in an ADR.
- Do not create a new ADR for a copy tweak, demo fixture, or reversible configuration.
- A demo fixture is not production evidence.
- Every item that blocks production must name its evidence in `prd/08-launch-gates.md`.
