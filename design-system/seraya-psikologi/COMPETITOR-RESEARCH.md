# Competitor UI/UX Research — Indonesian Psychology Services

Date: 2026-09-04 (refreshed after Round 4 review).  
Scope: Public-facing websites and observable UI/UX patterns for Indonesian psychology/counseling services.  
Target: Seraya Psikologi (Hono SSR / Cloudflare Worker, booking + manual WhatsApp payment).

> This is pattern research, not a current-implementation review. Pages change,
> some content is rendered dynamically, and the recommendations below are
> filtered through Seraya's smaller, human-first practice model rather than
> copying marketplace complexity. Each "observed" line below carries a
> confidence label (H = strongly visible across multiple pages, M = visible
> at one focal point, L = inferred from context). Recommendations without an
> observed tag are editorial for Seraya.

## Sources and access

| Site | Path reviewed | Date | Confidence |
|---|---|---|---|
| [Bicarakan.id](https://www.bicarakan.id/) | Homepage | 2026-09-04 | H — verified copy observed |
| [Ibunda.id](https://www.ibunda.id/konseling) | Counseling landing | 2026-09-04 | M — partial fetch |
| [Satu Persen](https://satupersen.net/layanan/konsultasi/konseling) | Konseling product page | 2026-09-04 | H — verified |
| [PsyKay](https://psykay.co.id/) | Homepage | 2026-09-04 | H — verified |
| [Berbagicerita.id](https://berbagicerita.id/web/) | Homepage | 2026-09-04 | H — verified |
| [Ceritakan.id](https://ceritakan.id/) | Homepage | 2026-09-04 | M — partial fetch |
| [Fastwork Counseling](https://fastwork.id/counseling) | Category page | 2026-09-04 | L — referenced for pricing |
| [Healing119.id](https://www.healing119.id/) | Crisis information | 2026-09-04 | H — verified for crisis hotline copy |

## Source role definitions

- **Matrix sources** — Bicarakan, Ibunda, Satu Persen, PsyKay, Berbagicerita.
  These are the comparators informing pattern decisions.
- **Price reference only** — Fastwork Counseling, Ceritakan.id. Cited for
  market price sense; not used in the comparator matrix.

## Executive findings

### Patterns worth adopting

1. **Show "what happens next" before asking for personal data.**  
   *Observed H.* Bicarakan, PsyKay, and Satu Persen all surface a 3-to-6
   step journey before form fields. Seraya should adopt a persistent 4-step
   stepper on `/book`, `/slots`, `/intake`, and `/booking/:id/confirmed`.  
   *Recommended* — implemented via `renderStepper()`.

2. **Make psychologist discovery comparable, not just a directory.**  
   *Observed H on Bicarakan.* Their cards expose name, credential,
   rating, review count, slot availability. For Seraya, recommend:
   avatar (initials fallback), name + credential sub-line, mode offered,
   next slot, and a verified chip **only when verified data exists**.  
   Never invent ratings or testimonials — confirmed in the round-4 review.

3. **One primary action per intent, not per page.**  
   *Observed H.* Bicarakan repeats "Booking Sekarang" 3x, Satu Persen
   "Daftar Konseling" 3x, but always with intent-appropriate verb.
   *Recommended* — Seraya uses: `Pilih layanan`, `Lihat jadwal`,
   `Lanjut ke pembayaran`, `Kirim bukti ke WhatsApp`. Keep one solid green
   CTA per visual region; orange only for payment or active-step.

4. **Trust is a multi-faceted content system, not a single badge.**  
   *Observed H — Bicarakan, Satu Persen, PsyKay.* Layers: real pro name
   + license, transparent price, confidentiality explanation, verified
   testimonials, and a clear crisis boundary. Seraya already has most of
   these; the gap is **real photos** (intials fallback for now) and a
   verified credential field.

5. **Use an assistance escape hatch.**  
   *Observed H.* WhatsApp/Admin contact remains the universal fallback.
   *Recommended* — "Tanya Admin" card on psychologist list and adjacent to
   profile CTAs; WhatsApp deep link only at the payment step.

6. **Topic-based entry points.**  
   *Observed H — Bicarakan.* Topic chips help first-time visitors
   self-identify. *Recommended* — non-clinical topic filter chips on
   `/psikolog` (Kecemasan, Relasi, Pengembangan diri, Keluarga &
   parenting, Akademik & karier). Avoid diagnostic quizzes.

7. **Booking gate: "browse" before "book"** — let me see the slots,
   see the calendar, see the price, before I sign in. *Observed L on
   marketplaces that require login first; this was the big Round-3
   friction in Seraya's own audit.* *Recommended* — `/book`, `/slots`
   are public; login required when choosing a slot (POST
   `/book/.../slots`).

### Patterns to adapt cautiously

- **Ratings and testimonials** — Useful only with consent, verification,
  and sufficient volume. Until then, prefer verified credential and
  service-quality facts. (Round-4 review notes this explicitly.)
- **Large service catalogs** — Ibunda, PsyKay, Berbagicerita serve many
  segments. Seraya should keep SERAYA PULANG focused; show other pillars
  as "Segera hadir" rather than making unavailable services look
  bookable.
- **Free screening/assessment** — PsyKay and Satu Persen expose
  screening. Outside Seraya's current product boundary (not an EMR);
  do not add to the booking funnel yet.
- **App-first or external-platform handoffs** — Satu Persen and
  Berbagicerita hand users to dashboards or Lynk. Seraya should keep
  users on-site through payment.
- **Discount-heavy pricing** — Marketplaces lean on urgency. Seraya's
  stable, plain-language prices are part of its trust position.

## Competitor pattern matrix

| Pattern | Bicarakan | Ibunda | Satu Persen | PsyKay | Berbagicerita | Seraya action |
|---|---|---|---|---|---|---|
| Online/offline choice | Strong H | Strong H | Mostly online H | Online H | Mixed H | Keep on service cards + booking step 1 |
| Psychologist directory | Strong H | Present H | Linked from flow M | Choice/filter H | Team page H | Add credentials, topics, mode, next slot |
| Rating/reviews | Strong H | Not visible M | Testimonials H | Credentials emphasis H | Team/trust facts H | Add only when verified; use facts meanwhile |
| Transparent prices | Strong H | Not visible M | Packages, price later M | Starting price H | Variable H | Keep visible on every offer/profile |
| Journey explainer | 3-step H | Direct booking M | Very explicit H | 6-step H | External platform L | Persistent 4-step Seraya stepper (DONE) |
| WhatsApp/help | Footer/contact H | Admin WhatsApp H | Less central M | Contact/tutorial H | Service contact H | Keep "Tanya Admin" escape hatch |
| Privacy/safety | Strong H | Less visible M | 119 disclaimer H | Confidentiality H | SOP/ethics H | Verified crisis copy + date stamp (DONE) |
| Topic navigation | Strong H | Service categories H | Problem-led hero H | Screening/topics H | Audience segments H | Add non-clinical topic chips |

## Recommended routes and success metrics

| Change | Where | Metric to watch | Current baseline |
|---|---|---|---|
| Browse-without-login for `/book` and `/slots` | `worker/index.ts` GET `/book`, GET `/book/:offeringId/slots` | Funnel from home → slot picker | Start point of the run |
| Topic chips on `/psikolog` | `renderPsychologistList` (planned) | Filter usage rate, profile-open rate | Currently zero filters |
| Persistent stepper across booking | `renderStepper()` already in views | Per-step exit rate | Not measured |
| Hold created on slot pick | `BookingModule.createSlotHoldOnly` | Drop-off between pick and intake | High — 10-minute free abandonment |
| Split intake into 3 sections + countdown | `renderBookingIntake` | Field error rate, completion rate | High — single long form |
| Confirmation POST/redirect/GET | POST `/api/booking/create` + GET `/booking/:id/confirmed` | Reload-after-confirmation duplicates observed | Vulnerable to duplicate bookings without this |
| Crisis verified-copy + date stamp | `renderCrisisNotice` + footer meta | Hotline link clicks; admin-contact after crisis page views | Not measured |
| Admin workspace dense shell | `renderAdminPaymentQueue` etc. (planned — deferred) | Time-to-review per payment proof | Estimated 60–90 sec per row |

## Seraya's positioning

- Calm, human-first local practice instead of marketplace overload
- Price clarity (Rp99k / Rp125k / Rp200k) without discount pressure
- Location clarity for Tatap Muka in Karangploso, Malang
- Explicit non-EMR boundary: no clinical notes, diagnoses, transcripts,
  or crisis narratives stored in the site
- Manual WhatsApp payment with a guided message template
- A visible "Tanya Admin" path for users who do not know how to choose

## Recommended implementation order (R4)

1. Persist nav account state and shared shell across every rendered page.
2. Upgrade psychologist list/profile with real photos, verified credential fields, topic chips, and availability.
3. Add booking stepper + slot cards + review summary. **DONE — `renderStepper`, `renderBookingOffer`, `renderBookingSlot`, POST `/book/:offeringId/slots`.**
4. Split intake into grouped sections with inline validation and hold countdown. **DONE — `renderBookingIntake`, `renderCountdown`, sticky CTA.**
5. Upgrade confirmation with orange payment card and copyable WhatsApp message. **DONE — `renderBookingConfirmation`, GET `/booking/:id/confirmed`.**
6. Improve FAQ/legal/safety scanability. **DONE for crisis — hotline list + verified date.**
7. Replace raw admin HTML with shared admin shell, KPI strip, tabs, badges, and destructive-action confirmation. (DEFERRED — Round 5.)
8. Add verified testimonials/ratings only after consent and sufficient data exist.
