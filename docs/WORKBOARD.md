# Seraya Psikologi — Workboard

> Lightweight Kanban. This is the current project-control document. Move an item only when the stated evidence exists.

Last reviewed: 2026-09-02

## DONE — verified

- **D01 — Project documentation is organized** — this control center, small PRDs, and reference links exist.
- **D02 — Public docs site is live** — Cloudflare Pages deployment responds successfully.
- **D03 — Public MVP pages are live** — home, SERAYA PULANG, Fuja, FAQ, safety, privacy, consent, cancellation, and booking pages respond successfully.
- **D04 — Booking happy path works** — a valid client + offer + future slot creates a booking in `pending_manual_payment` and creates the hold/reservation.
- **D05 — Manual payment handoff works** — confirmation page provides preliminary payment instructions and a WhatsApp deep-link; the official PDF/text invoice is generated only after Admin verification.
- **D06 — D1 demo data exists** — Fuja, two offerings, weekday demo slots, and a placeholder staff row are seeded.
- **D07 — GitHub repository is pushed** — source and generated docs are in `fajarabdillahfn/seraya-psikologi`.
- **D08 — Domain decisions are recorded** — booking, capacity, intake, no-show, cancellation, and payment decisions are documented in ADRs 0089–0097.
- **D10 — Documentation refactor published** — overview + kanban + focused PRDs + reference archive.
- **D11 — PRD 01 business review closed** — profile/address fields, counseling intake, individual-only scope, online prices, offline price/schedule/venue, cutoff, and labels are approved. Implementation is intentionally deferred.
- **D12 — PRD 02 business review closed** — manual payment flow: client transfers, sends proof via WhatsApp, Admin verifies in the web admin dashboard, then the official invoice is generated and the booking is confirmed; under/overpayment rules and cancellation note defined. Implementation is intentionally deferred.
- **D14 — PRD 04 business review closed** — Sunday–Saturday booking, public-holiday closure, 60-minute shared grid, Admin WhatsApp changes, and psychologist-unavailable procedure approved. Implementation is intentionally deferred.
- **D15 — PRD 05 business review closed** — client-side cancellation/refund via WhatsApp only; Admin status and cancellation/refund evidence requirements approved. Implementation is intentionally deferred.
- **D16 — PRD 06 business review closed** — data scope, client/Admin access, scoped psychologist sharing (including confirmed booking mode, slot, topics, non-clinical description, expected outcome, and returning-client flag), client rights, email breach notice, 18+ policy, no marketing, and placeholder public copy approved. Implementation is intentionally deferred.
- **D17 — PRD 07 business review closed** — Superadmin/Admin/Psychologist roles, one Superadmin, dashboard procedures, audit trail, and 1-hour operational target approved. Implementation is intentionally deferred.
- **D18 — PRD 08 business review closed** — lightweight maintainer launch checklist approved; deferred features separated from launch blockers. Implementation is intentionally deferred.
- **D19 — Hermes + Agy final cross-review completed** — five findings were reconciled: buffer-aware starts, psychologist context, explicit mandatory-field authority, provider-unavailable cancellation evidence, and stale documentation. Business PRD review remains closed; implementation is still paused.

## DOING — current focus

- **No active product-owner review item.** Business PRD review is complete. The next item is implementation planning, but implementation remains paused until explicitly resumed.

## NEXT — ordered

- **N10 — Implementation backlog** — translate the closed PRDs into small implementation slices and acceptance tests. Do not modify code yet.
- **N11 — Implementation approval checkpoint** — review the backlog, dependencies, and test seams before coding.
- **N12 — Resume implementation** — only after explicit user approval.
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
