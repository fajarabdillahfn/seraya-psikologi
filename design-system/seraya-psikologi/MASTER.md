# Seraya Psikologi — Design System (Source of Truth)

> Last refreshed: 2026-09-04 (post Round 4 — design review fixes applied).
> This document is the single source of truth for visual/UX decisions
> across `mvp/app/src/views/*` (production code) and the design mockups in
> `preview.html`. Editing tokens here is the only "right" place to rebrand.

## 1. Tokens (`--brand`, `--accent`, etc.)

All tokens live in `:root` of `BASE_STYLES` in `mvp/app/src/views/index.ts`
and the same `:root` block in `mvp/app/src/views/client-auth.ts`.

| Token | Hex | Role | Contrast vs `--cream` |
|---|---|---|---|
| `--brand` | `#2F6B5B` | Primary green — buttons, links, prices, focus | 6.22:1 |
| `--brand-dark` | `#214542` | Headings, dark quote card | 10.09:1 |
| `--brand-tint` | `#E9F2EE` | Section bg, selected states, helper cards | n/a |
| `--accent` | `#C2410C` | Orange — money moments only (CTA pembayaran) | 5.18:1 |
| `--accent-deep` | `#9A3412` | Orange body text links (AAA-grade) | 7.31:1 |
| `--accent-tint` | `#FFF1E7` | Warm panels (payment, hold chip) | n/a |
| `--warm` | `#F3E9D2` | Sand — hero gradients, step numbers | n/a |
| `--cream` / `--background` | `#FCFAF5` | Page background | n/a |
| `--surface` | `#FFFFFF` | Cards | n/a |
| `--ink` | `#23302E` | Body text | 13.13:1 |
| `--muted` | `#66716F` | Secondary text | 4.84:1 |
| `--line` | `#DFE7E3` | Borders, dividers | n/a |
| `--success-tint` | `#EEF8F3` | Success panels | n/a |
| `--warning-tint` | `#FFF8E8` | Operational warnings | n/a |
| `--warning-border` | `#C48727` | Warning left border | n/a |
| `--crisis-tint` | `#FFF5F0` | Crisis page panel (warm, not alarm) | n/a |
| `--crisis-border` | `#E6AA96` | Crisis panel border | n/a |
| `--crisis-ink` | `#5E3025` | Crisis text (10.16:1 AAA) | 10.16:1 |
| `--danger` | `#B85B3A` | Errors only | n/a |
| `--step-active` / `--step-done` / `--step-pending` | (vars) | Booking wizard state | n/a |

**Usage rule** — green owns identity and navigation; orange owns momentum
(money or active-step); red is for validation errors only. Never two orange
primary CTAs per view. Crisis stays in the warm terracotta family, never
red-alarm.

## 2. Typography

Pairing: **Lora (headings) + Raleway (body)** — "Wellness Calm" profile
from the design system. Loaded from Google Fonts with `display=swap`.

```css
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700&family=Raleway:wght@400;500;600;700;800&display=swap');
```

Type scale:

- H1: clamp(2.1rem, 5vw, 4.5rem), Lora 600, line-height 1.14, letter-spacing -0.02em
- H2: clamp(1.35rem, 3vw, 2rem), Lora 600, line-height 1.25
- H3: 19px (cards) / 17px (field set) — Lora 600
- Body: 16px minimum, Raleway 400, line-height 1.65, color `--ink`
- Eyebrow: 11.5px Raleway 800, uppercase, letter-spacing 0.14em
- Price: Raleway 800 1.25rem, color `--brand`
- Button text: 14–16px Raleway 700

Self-hosted font fallback via `system-ui`. Body minimum 16px (mobile
accessibility); metadata can drop to 13–14px if contrast is sufficient.

## 3. Layout & spacing

- Container: `max-width: 1120px`, side padding 24px / 16px mobile
- Section spacing: 64–96px desktop, 40–56px mobile
- Radii: cards 16, hero 24, pills 999, inputs 10, helper 16
- 3-col grids for service cards; collapses to 1 col ≤720px
- 2-col profile layout; sidebar sticky until ≤720px
- Touch targets ≥ 44×44px (hero chips, trust pills, step chips, slot cards)
- Hero orbits and decorative elements get `aria-hidden="true"`

## 4. Components

### Account navigation (logged in/out)

```html
<a class="btn btn-outline" href="/auth/login?return_to=/book">Masuk</a>
<a class="cta" href="/book">Booking Sesi</a>
```

Logged out: Masuk is outline (secondary highlight) beside solid Booking
Sesi. Logged in: same slot swaps to "Profil Saya" with an icon + chevron.
The dropdown shows "Profil Saya" and "Keluar" — destructive actions are
hidden by default. Dropdown is a real `aria-haspopup` widget, not a
hover-only element. Escape and outside click close it.

### Persistent booking stepper (4-step)

Rendered on every booking page via `renderStepper(currentStep)`:

1. **Jasa** — Pilih layanan dan psikolog
2. **Jadwal** — Pilih waktu
3. **Data diri** — Lengkapi biodata + topik
4. **Bayar** — Selesaikan pembayaran manual via WhatsApp

Step indicator uses `--step-active` (orange) for current, `--step-done`
(green) for past. Default to exposing all four steps from `/book`.

### Hold countdown chip

Inline widget that ticks every second and turns `--warning-tint` on expiry.
Hold is 10 minutes; "Slot ditahan · MM:SS" then becomes "Hold telah
kedaluwarsa — pilih ulang slot". This is the single orange CTAs allowed
on the intake form.

### Topic chips (intake)

`<label class="topic-chip"><input type=checkbox> …</label>` — visually
clickable, semantically a checkbox group, hit area ≥ 36px.

### Service card with mode indicator

Three modes — Chat (online), Call (online), Tatap Muka (offline) — share
the same card shell. Mode is shown as eyebrow ("Online / Offline ·
Malang") and the price is the right-aligned anchor. CTA link goes
directly to slot picker for that psychologist + mode.

### Profile hero

- Breadcrumb above the hero
- Profile-avatar with initials fallback (color depends on name length parity)
- Title: short name only (no long credential); credentials on a sub-line
- Optional verified chip (only when data is verified; never invented)
- Trust pill row (Siap booking, Sesi individual, Durasi 60 menit)
- "Bingung memilih? → Tanya Admin" helper card adjacent
- Two-column body: bio + topik + pendidikan / layanan sidebar (sticky)

## 5. UX rules by flow

1. **Browse tanpa login** — `/`, `/psikolog`, `/psikolog/:id`, `/book`,
   `/book/:offeringId/slots` semua boleh diakses tanpa login. Tombol "Pilih
   slot ini" di slot picker yang akan redirect ke login bila belum session.
2. **Login wajib saat menahan slot** — POST `/book/:offeringId/slots`
   membuat slot hold 10 menit dan redirect ke intake. Sebelum POST dicek
   `session` lalu `profileComplete`.
3. **Intake grouped & validated server-side** — tiga fieldset:
   Data diri, Topik sesi, Persetujuan. Crisis ack + consent dipisah jadi
   dua checkbox. Inline validation menggunakan inline `required` attribute.
   Submit menampilkan spinner dan label "Memproses…".
4. **Hold timer aktual** — membuat hold di slot pick, countdown live
   di intake, expiry fallback "pilih ulang slot" via inline script
   (12 baris, tidak butuh framework).
5. **POST/redirect/GET untuk confirmation** — reload halaman konfirmasi
   tidak membuat booking ulang.
6. **Error klinis dipisah** — bila booking.createBooking melempar error
   dengan kata "clinical" atau "crisis", user di-redirect ke
   `/safety/crisis?from=booking`. 500 fallback UI tidak bocorkan raw
   stack ke klien.
7. **Verification — Hanya fakta, tidak pernah testimonial fiktif.**
   Setiap pill "Siap booking", "Durasi 60 menit", dan "Tanpa catatan
   klinis di web" berdasarkan data yang ada di kode.

## 6. Accessibility & safety

- Focus ring 3px `--brand` + 3px offset pada setiap element interaktif
- Tombol diberikan `min-height: 44px`
- Form fields dengan label langsung (bukan placeholder-only)
- Submit feedback loading → success
- `prefers-reduced-motion` menonaktifkan animasi
- Crisis call tidak menggunakan telepon (cuma link `tel:119`) — fallback
  text "datangi IGD rumah sakit terdekat" tetap ada
- Crisis panel warm terracotta, bukan red-alarm
- Crisis hotline yang ditampilkan: **119 (Kemenkes 24 jam)** dan
  **119 ext. 8 (Kemenkes)**; `ext. 4 Into The Light` sudah dihapus
  karena belum terverifikasi. Daftar terakhir diverifikasi **4 September 2026**.

## 7. Anti-patterns

- Emoji atau `✓`, `→` glyphs sebagai icon — ganti dengan inline SVG.
- Placeholder-only input label.
- Tombol dengan width 100% yang sebenarnya tidak butuh full-width.
- Orange CTA lebih dari satu per view.
- Tooltip-only reveal (semua info harus tersedia sebagai teks saat
  keyboard focus atau tap).
- Klaim "100% aman", "nomor 1", "terbaik" — diganti dengan fakta
  spesifik dan terukur.
- Menyimpan atau menyiratkan penyimpanan catatan klinis di website.

## 8. Pre-delivery checklist (10 items)

- [ ] Tidak ada emoji atau text glyph sebagai icon
- [ ] Focus ring terlihat pada setiap kontrol interaktif
- [ ] Submit feedback menampilkan loading + success / error
- [ ] Form fields minimal 44px, label visible, error dekat field
- [ ] Booking stepper tampil di semua halaman booking
- [ ] Hold countdown ter-render di intake setelah slot dipilih
- [ ] Crisis page mencantumkan hanya kontak terverifikasi + tanggal
- [ ] Reload `/booking/:id/confirmed` tidak membuat booking baru
- [ ] `prefers-reduced-motion` menonaktifkan transition
- [ ] `npx tsc --noEmit` and `npm test` hijau
