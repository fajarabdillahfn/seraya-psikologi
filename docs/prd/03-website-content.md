# PRD 03 — Website Content

Status: **Business review closed** on 2026-09-02. Implementation intentionally deferred.

## Goal

Give visitors enough trustworthy information to understand Seraya, decide whether the service fits, and start booking without overpromising. The website must feel warm and professional, communicate in Bahasa Indonesia, and avoid false claims.

## Public navigation

The top navigation reflects the public structure:

- **Beranda** — landing, brand introduction, call to action to start booking or to learn more.
- **Layanan** — overview of the programs. On hover/focus, a submenu appears with the four program names and a one-line quick brief for each. Direct booking is currently available only for Konseling Individual under SERAYA PULANG.
- **List Psikolog** — directory of psychologists available for booking. For launch this shows Fuja Rahayu Kinanti as the only bookable psychologist.
- **About** — what Seraya is, who it is for, and the team's approach. The page is honest about scope and does not make clinical or therapeutic outcome claims.
- **FAQ** — common questions and answers, including booking, payment, cancellation, privacy, and crisis support.
- **Konseling Individual** (linked from Beranda and Layanan) — direct path into booking, separate from Layanan overview.

In addition to the navigation:

- Booking flow is reached from Layanan → Konseling Individual, and from Beranda as a CTA.
- Safety/Crisis boundary, Privacy, Informed Consent, Cancellation/Refund, and Booking subpages remain legal/operational pages. They are not in the main top navigation, but each is reachable from the footer and from relevant CTAs in the booking and Layanan pages.

## Layanan hover/focus submenu

When the user hovers or focuses **Layanan**, a submenu reveals the four programs with a quick brief each:

- **SERAYA PULANG** — Konseling individu, online via Chat/Call dan offline di Havana Park. Satu janji yang hangat dan terstruktur.
- **SERAYA BERDAYA** — Konten dan sumber untuk penguatan pribadi, emosi, dan relasi. Saat ini tidak menerima booking.
- **SERAYA BERSAMA** — Konten dan aktivitas kelompok yang dirancang untuk belajar bersama. Saat ini tidak menerima booking.
- **SERAYA BERBAGI** — Konten dan inisiatif berbagi pengetahuan untuk komunitas yang lebih luas. Saat ini tidak menerima booking.

The submenu copy can be edited without changing this PRD as long as it does not introduce unapproved claims or prices. Only **SERAYA PULANG** is bookable in launch.

## Tone

- **Warm:** approachable language; show that the team understands the user is taking a personal step, not just buying a product.
- **Professional:** accurate, calm, no overpromising; clear boundaries of what counseling can and cannot do.
- **Voice rules:**
  - Use the second person (“kamu”) or the neutral third person; avoid the stiff corporate “kami sebagai”.
  - Prefer concrete sentences over jargon.
  - Never promise diagnosis, instant cure, guaranteed outcomes, or that a session is required to “heal”.
  - Never present the service as emergency care. The Safety/Crisis page exists specifically to redirect emergencies to professional crisis services.

## Public claims

The website may publish:

- Service names, modes, durations, prices, and the schedule as defined in PRD 01 and PRD 04.
- Psychologist name, credentials, education, expertise areas, and approach.
- General program descriptions and the way sessions are conducted.
- Operational information: how to book, how to pay, how cancellation works, what data is collected.
- The Seraya brand and contact information.

The website may not publish:

- Outcome claims, success rates, testimonials that imply a guaranteed result, or before/after narratives.
- Any diagnostic or treatment language outside what is approved in informed consent copy.
- Personal client information.
- Credentials, awards, or affiliations that are not in the approved professional record.

## List of psychologists

- For launch, **List Psikolog** displays the only confirmed bookable psychologist, Fuja Rahayu Kinanti.
- Each psychologist card shows: name, credentials, education, expertise areas, approach, and a CTA to start booking with that psychologist. Pricing, mode, and available slots come from the booking flow.
- New psychologists can be added to the directory only after the same review and publication process as launch.

## About

The About page is the public face of the organization. It must include:

- A short, honest description of what Seraya is and is not.
- The team’s general approach (warm, professional, evidence-aware).
- A non-clinical positioning. It must not claim superiority, special methodology, or proprietary therapeutic brand.
- The public contact channel (Admin WhatsApp number is set via configuration, and the same channel appears in the Booking flow).
- Privacy and Informed Consent links. Footer also links to Privacy, Informed Consent, and Cancellation/Refund.

The page may include a non-promotional mention of the broader four-pillar structure (PULANG, BERDAYA, BERSAMA, BERBAGI) for context, but it must not market the other pillars as bookable.

## FAQ

FAQ is grouped by topic, in this order:

1. Booking (how to book, what is needed, what happens if I cancel)
2. Payment (how to pay, what if the amount is wrong, when is the booking confirmed)
3. Cancellation and refund (the policy, who to contact, how the refund is processed)
4. Privacy and data (what data is collected, how it is stored, who can see it)
5. Safety and crisis (what to do if there is an emergency, why Seraya is not a crisis service)
6. About the psychologists and approach (qualifications, supervision, fit)

The FAQ answers link to the relevant legal/operational pages (Privacy, Informed Consent, Cancellation, Safety) and to the booking flow.

## Legal and operational pages

The site includes the following pages, all in Bahasa Indonesia. Each is reached from the footer, from the relevant booking step, and from the FAQ.

- **Privacy** — what data is collected, why, how long it is stored, who can see it, and how to request changes.
- **Informed Consent** — the versioned consent the client accepts before booking, in plain language.
- **Cancellation/Refund** — the policy and the Admin WhatsApp channel for cancellation/refund requests.
- **Safety/Crisis** — a non-prominent, clear notice that Seraya is not an emergency service, plus where to go in an emergency.
- **Booking subpages** — login, profile, slot selection, intake, payment handoff, confirmation, and invoice.

The actual copy for Privacy, Informed Consent, Cancellation, and Safety is reviewed under PRD 06; this PRD records only the page list and the rule that they exist.

## Visual and brand assets

- Brand mark, logo, photography, and any other visual assets are **placeholders** until the product owner adds the real assets to the repository.
- Placeholders must be clearly marked in the code (e.g., `assets/placeholder-logo.svg`, `assets/placeholder-fuja.jpg`) and accompanied by a short note in `docs/reference/assets/README.md`.
- No invented credentials, awards, or affiliation logos. Anything published as an asset must correspond to a real, approved file.

## Language

- The website is **100% Bahasa Indonesia** for the current launch scope.
- No English copy is published. English terms may be used only inside code identifiers, technical metadata, and internal comments.
- User-facing forms, validation messages, error pages, and confirmation messages are all in Bahasa Indonesia.

## Accessibility, performance, and SEO

- All public pages must work on a modern mobile browser. Layouts must not require horizontal scrolling at 360px width.
- Form fields must have proper labels and inline error messages; no placeholders acting as labels.
- Pages must declare `lang="id"`, a meaningful `<title>`, and a meta description in Bahasa Indonesia.
- Each major page has a single `<h1>` and a clear content hierarchy.
- Page performance target: under 2.5s First Contentful Paint on a 4G connection. This is a target, not a hard blocker for launch.
- SEO target: a sitemap and a robots file are deployed with the launch build; structured data for service, psychologist, and FAQ pages is prepared for a later sprint and is not a launch blocker.

## Decision checkpoint

Before changing website copy or adding assets, the product owner confirms:

- New claim or new professional credential for any psychologist.
- Any new program or pilot program.
- Any change to the public cancellation/refund wording that affects legal obligations.
- Any change to the public crisis/safety wording.
- Any change to the language rule (for example, going bilingual).

Routine copy edits that do not change claims, scope, or policy do not require a new decision; they are reviewed in the regular review.

## Open items for this PRD

- The product owner will add the real visual assets later; until then, all visuals are placeholders.
- Final copy for Privacy, Informed Consent, Cancellation/Refund, and Safety is owned by PRD 06 and must be reviewed before publication.
- The exact navigation labels and order are design decisions, not PRD decisions. They must be consistent with the navigation listed here, but the wording can be iterated without a new PRD.
- SEO/A11y/performance items are recorded as launch-time targets, not as launch blockers.
- If a fifth program is added later, this PRD needs a small revision to add it to the Layanan submenu and About text.

## References

- `docs/prd/01-booking-flow.md`
- `docs/prd/04-availability-scheduling.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`

## Change log

- 2026-09-02: Created PRD 03 to record public navigation (Beranda, Layanan with four-pillar hover submenu, List Psikolog, About, FAQ), tone rules, claim rules, List Psikolog scope, About content rules, FAQ structure, legal page list, asset placeholder policy, 100% Bahasa Indonesia, accessibility/performance/SEO targets, and a decision checkpoint.
