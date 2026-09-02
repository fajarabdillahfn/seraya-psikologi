# Seraya Psikologi — Project Overview

> One-page orientation. Start here before opening ADRs or the implementation guide.

## Current status

**MVP is live for review, not production launch.**

- Public website + booking flow: deployed on Cloudflare Worker.
- Payment launch path: manual bank transfer/QRIS + WhatsApp Admin verification.
- Documentation: this control center is the entry point; long-form ADRs are reference material.
- Production: blocked until the launch gates below are completed and signed off.

## Business scope that is already decided

- Brand: **Seraya Psikologi**.
- Launch bookable program: **SERAYA PULANG**.
- Launch psychologist: **Fuja Rahayu Kinanti** (publication evidence still needs operational verification).
- Session: individual online/offline counseling, 60 minutes.
- Client: guest booking; minimum intake is name + email + consent; phone is optional.
- Cancellation/refund: Admin WhatsApp; no public cancellation/refund UI; outcomes are full refund or no refund.
- Couple counseling: modeled, but launch timing is still deferred.
- MVP does not store clinical notes, diagnosis, assessment results, transcripts, or session notes.

## Current technical shape

- Runtime: Cloudflare Worker + Hono.
- Database: Cloudflare D1.
- Persistence boundary: `PersistenceAdapter`.
- Booking: slot hold + capacity reservation + overlap protection.
- Payment: `payment_proof` + Admin mark-as-paid; Midtrans is deferred.
- Auth: placeholder for development; not acceptable for production staff access.

## Where to go next

1. [[WORKBOARD]] — what is done, active, next, blocked, and deferred.
2. [[prd/README]] — small PRD index.
3. [[prd/01-booking-flow]] — customer booking flow.
4. [[prd/02-payment-flow]] — WhatsApp manual payment flow.
5. [[prd/03-website-content]] — website pages and copy boundaries.
6. [[prd/08-launch-gates]] — what must be true before production.
7. `docs/adr/` — detailed historical/technical decisions; do not use as the first reading path.

## Live links

- Docs website: https://seraya-psikologi-docs.pages.dev
- MVP Worker: https://seraya-psikologi.aurinko-jar-ai.workers.dev
- GitHub: https://github.com/fajarabdillahfn/seraya-psikologi

## Source-of-truth rule

For business scope, the accepted non-technical decision wins. For technical behavior, the current implementation baseline and accepted ADR win. If they conflict, record the conflict on `WORKBOARD.md`; do not silently resolve it in code.
