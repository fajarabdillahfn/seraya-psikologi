# UI/UX Checkpoint 01 — Google SSO + Profile Completion

Status: **Design brief ready for review**
Date: 2026-09-03
Scope: S02 Client Profile + S03 Google SSO client login gate

> This is a design artifact, not an implementation authorization. Code changes remain paused until the user explicitly starts N12.

## Objective

Make login and profile completion feel like one clear first step before booking:

1. Client chooses Login with Google.
2. Google authenticates the client.
3. The system checks profile completeness and age eligibility.
4. Incomplete clients complete Profil Saya and Alamat Saya.
5. Complete and eligible clients return to the booking path they originally requested.

## Surface archetypes

- Login: **Decide/Learn** — one focused action, trust-building explanation, no competing actions.
- Profile completion: **Configure** — progressive form, clear requiredness, validation, save state, and recovery from errors.

## Screen states

### 1. Login gate — `/auth/login`

Default:

- Seraya Psikologi brand.
- Heading: `Masuk untuk Melanjutkan Booking`.
- Short explanation: login is required to protect booking data and send confirmation to the verified email.
- Primary action: `Lanjutkan dengan Google`.
- Link to Privacy and Safety/Crisis information.
- Preserve a validated internal `return_to` path.

Loading:

- Button becomes `Menghubungkan ke Google...`.
- Prevent duplicate clicks.

OAuth error/cancelled:

- Alert: `Gagal menghubungkan akun Google. Silakan coba kembali.`
- Keep the client on the login page.
- Do not lose the validated booking destination.

Expired session:

- Alert: `Sesi Anda telah berakhir. Silakan masuk kembali untuk melanjutkan.`

### 2. Profile completion — `/client/profile`

Header:

- Heading: `Lengkapi Profil Anda`.
- Explain that the data is needed before booking.
- Show verified Google email as read-only account identity.
- Do not present Google account name as the user-entered profile name.

Sections:

1. `Profil Saya`
2. `Alamat Saya`

Saving:

- Button becomes `Menyimpan Profil...`.
- Disable inputs and prevent duplicate submission.

Validation error:

- A top summary uses `role="alert"`.
- Focus moves to the summary.
- Invalid fields have inline errors and preserve entered values.

Age ineligible:

- Tanggal Lahir shows an inline error.
- Submit is blocked for age below 18.
- Copy: `Layanan pendaftaran mandiri saat ini hanya tersedia untuk klien berusia 18 tahun ke atas. Untuk kebutuhan rujukan atau bantuan, silakan hubungi WhatsApp Admin Seraya.`

Success:

- Save profile.
- Set profile complete.
- Redirect to the validated internal `return_to` path.
- Show: `Profil berhasil disimpan. Silakan lanjutkan pemilihan jadwal sesi.`

## Field inventory

All fields below are required by the product-owner decision. Do not add fields without a new product decision.

### Profil Saya

- Nama Panggilan — text input.
- Tanggal Lahir — date input; must represent age 18+ on the current Asia/Jakarta date.
- Jenis Kelamin — select.
- Pekerjaan — text input.
- Pendidikan — select.
- No. WhatsApp — telephone input; normalize and validate Indonesian number.
- Status — select.
- Agama — select.

### Alamat Saya

- Negara — select or text input; default Indonesia.
- Provinsi — text input; a lightweight datalist may be used.
- Kota atau Kabupaten — text input; a lightweight datalist may be used.
- Alamat — textarea.

### Account identity

- Google email — read-only, supplied by Google SSO.
- Google subject/account identifier — system-only; never editable or displayed as a form field.

## Validation behavior

All user-facing messages are in Bahasa Indonesia.

- Missing field: `<Label> wajib diisi.`
- Invalid date: `Tanggal lahir tidak valid.`
- Future date: `Tanggal lahir tidak boleh di masa depan.`
- Under 18: use the age-ineligible copy above.
- Invalid WhatsApp: `Nomor WhatsApp tidak valid. Gunakan format nomor Indonesia aktif, contoh: 08123456789.`
- Invalid/empty address: `Mohon masukkan alamat domisili lengkap.`
- Form summary: `Mohon lengkapi dan periksa kembali data Anda sebelum melanjutkan.`

Validation rules:

- Validate on blur and again on server submit.
- Trim text values.
- Normalize valid `08...` to `+628...` before storage.
- Accept `+628...` and approved local Indonesian format at input; store one canonical format.
- Calculate age using `Asia/Jakarta`, not server-local timezone.
- Never log submitted profile values or validation payloads.

Exact dropdown vocabularies remain implementation details unless already specified in the business PRD; do not silently add sensitive categories.

## Privacy boundaries

The form may explain that data is used for identity, booking, administration, and offline-session operations. It must not imply that all profile fields are shared with the psychologist.

Psychologist sharing is not part of this screen. Later, for a confirmed booking, the psychologist receives only the approved operational whitelist:

- Nama Panggilan.
- Nomor WhatsApp.
- Mode: Chat, Call, or Offline.
- Scheduled slot.
- Counseling topics.
- Non-clinical problem description.
- Expected outcome.
- Returning-client flag.

The psychologist does not receive full address, religion, occupation, education, or payment evidence.

## Mobile layout

Target viewport: 360px and above.

- Single-column layout.
- 16px horizontal gutter.
- Sections stacked as `Profil Saya` then `Alamat Saya`.
- Inputs at least 44px high; use 16px input text.
- Full-width primary save button.
- Do not rely on placeholder text as the field label.
- Error summary and field errors remain readable without horizontal scrolling.
- Keep the Google login gate visually simple and centered.

## Accessibility

- Use semantic `<form>`, `<fieldset>`, and `<legend>`.
- Every input has an explicit `<label for="...">`.
- Every required field exposes required state to assistive technology.
- Invalid input uses `aria-invalid="true"`.
- Inline errors are referenced through `aria-describedby`.
- Error summary uses `role="alert"` and receives focus after failed submit.
- Focus indicator must be visible against the Seraya palette.
- Keyboard users can complete all fields and submit without a mouse.

## Redirect and security behavior

- `return_to` accepts only an internal relative path.
- Reject `https://...`, protocol-relative `//...`, and malformed values.
- Fallback is a safe internal booking entry route.
- Session cookie is HTTP-only, Secure, SameSite=Lax, and scoped to `/`.
- Google identity is the account key; user-entered fields cannot change account ownership.
- Profile completion does not grant access to another client’s booking.

## Design acceptance criteria

- [ ] Login gate has one clear primary CTA and explains why login is required.
- [ ] OAuth loading, cancel/error, expired-session, and success states are designed.
- [ ] Profile form contains exactly the approved fields, grouped into Profil Saya and Alamat Saya.
- [ ] All fields are visually marked required.
- [ ] Age 18+ and WhatsApp validation states are designed.
- [ ] Server-side validation failure preserves entered values.
- [ ] Success returns the client to the original internal booking path.
- [ ] 360px mobile layout is usable without horizontal scrolling.
- [ ] Keyboard and screen-reader behavior is specified.
- [ ] Privacy explanation does not imply full-profile sharing with psychologists.
- [ ] No clinical-record field is added.

## Implementation handoff boundary

This brief is ready to inform S02/S03 implementation after design review. It does not authorize code changes, schema changes, migration, or deployment. N12 remains a separate explicit approval.

## Source references

- `docs/prd/01-booking-flow.md`
- `docs/prd/06-privacy-consent.md`
- `docs/prd/07-staff-admin-operations.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs-site/reference/screenshots/ibunda-mockup-profil-alamat.jpg`
- Agy design review: Gemini 3.8 Flash High, 2026-09-03

## Review notes

- Google SSO account identity and user-entered Nama Panggilan are intentionally separate.
- All profile/address fields remain required because this is an explicit business decision.
- The form design should not decide the final legal/privacy wording; PRD 06 owns that copy.
- This first checkpoint is deliberately limited to client login and profile completion; booking and Admin screens belong to later checkpoints.
