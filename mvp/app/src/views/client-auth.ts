const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const valueOf = (profile: Record<string, unknown>, key: string) =>
  escapeHtml(String(profile[key] ?? ""));

const ROOT_TOKENS = `
  :root{
    --brand:#2F6B5B; --brand-dark:#214542; --brand-tint:#E9F2EE;
    --accent:#C2410C; --accent-deep:#9A3412; --accent-tint:#FFF1E7;
    --warm:#F3E9D2; --background:#FCFAF5; --surface:#FFFFFF;
    --ink:#23302E; --muted:#66716F; --line:#DFE7E3; --muted-deep:#3C4A47;
    --success-tint:#EEF8F3; --warning-tint:#FFF8E8; --warning-border:#C48727;
    --danger:#B85B3A;
    --step-active:var(--accent); --step-done:var(--brand); --step-pending:var(--line);
  }
`;

const profileStyles = `<style>
  ${ROOT_TOKENS}
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--background);line-height:1.65}
  a,button,input,select{font-family:inherit}
  a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--brand);outline-offset:3px;border-radius:6px}
  .profile-shell{max-width:760px;margin:0 auto;padding:24px 16px 56px}
  .profile-header{display:flex;align-items:center;gap:12px;margin-bottom:24px}
  .profile-header img{width:42px;height:42px;object-fit:contain;border-radius:10px}
  .profile-header a{color:var(--brand-dark);text-decoration:none;font-weight:800}
  .profile-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:20px;margin:16px 0;box-shadow:0 8px 24px rgba(33,69,66,.05)}
  .profile-card h2{margin:0 0 4px;color:var(--brand-dark);font-size:1.35rem;font-family:"Lora",Georgia,serif;letter-spacing:-.015em}
  .profile-card>p{margin-top:4px;color:var(--muted);font-size:.92rem}
  .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}
  .profile-field{margin:10px 0}
  .profile-field label{font-weight:650;color:var(--muted-deep)}
  .profile-field input,.profile-field select{display:block;width:100%;min-height:46px;margin-top:5px;padding:9px 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface);font:inherit;font-size:16px;color:var(--ink)}
  .profile-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:20px}
  .profile-actions button{min-height:48px;padding:11px 18px;border:0;border-radius:10px;background:var(--brand);color:#fff;font:inherit;font-weight:750;cursor:pointer;box-shadow:0 5px 14px rgba(47,107,91,.18)}
  .profile-actions button:hover{background:var(--brand-dark)}
  .profile-actions button[disabled]{opacity:.6;cursor:progress}
  .profile-actions a{color:var(--brand-dark);text-decoration:none;font-weight:650;padding:8px 4px}
  .profile-note{background:var(--success-tint);border-left:4px solid var(--brand);padding:12px 14px;border-radius:0 10px 10px 0;margin:16px 0;color:var(--brand-dark)}
  @media(max-width:620px){.profile-grid{grid-template-columns:1fr}.profile-shell{padding:16px 12px 40px}.profile-card{padding:16px}.profile-actions{align-items:stretch;flex-direction:column}.profile-actions button{width:100%}}
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms !important;transition-duration:0.01ms !important}}
</style>`;

const loginStyles = `<style>
  ${ROOT_TOKENS}
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:640px;margin:0 auto;padding:32px 20px;line-height:1.6;color:var(--ink);background:var(--background)}
  h1{font-family:"Lora",Georgia,serif;color:var(--brand-dark);letter-spacing:-.02em;font-size:1.85rem;margin:0 0 8px}
  p{color:var(--muted)}
  .login-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 14px 28px -22px rgba(33,69,66,.25);margin:18px 0}
  .cta{display:inline-flex;align-items:center;gap:9px;background:var(--brand);color:#fff;padding:13px 22px;border-radius:11px;text-decoration:none;font-weight:700;box-shadow:0 5px 14px rgba(47,107,91,.22);min-height:48px}
  .cta:hover{background:var(--brand-dark)}
  .cta:focus-visible{outline:3px solid var(--brand);outline-offset:3px}
  .meta{font-size:13.5px;color:var(--muted);margin-top:10px}
  .meta b{color:var(--brand-dark)}
  .warning{background:var(--warning-tint);border-left:4px solid var(--warning-border);padding:12px 14px;border-radius:0 10px 10px 0;margin:16px 0;color:#6B4A2E}
  .esc{font-size:12.5px;color:var(--muted);margin-top:14px}
  .esc a{color:var(--brand-dark)}
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms !important;transition-duration:0.01ms !important}}
</style>`;

const fieldHelp =
  "Data ini disimpan untuk kebutuhan layanan dan administrasi. Psikolog hanya menerima informasi yang diperlukan untuk sesi.";

export function renderClientLogin(args: {
  returnTo: string;
  error?: string;
}): string {
  const error = args.error
    ? `<div class="warning" role="alert">${escapeHtml(args.error)}</div>`
    : "";
  const returnHint = args.returnTo
    ? `, dan kamu akan kembali ke <b>${escapeHtml(args.returnTo)}</b> setelah masuk`
    : "";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Masuk — Seraya Psikologi</title><meta name="description" content="Masuk dengan akun Google untuk melanjutkan booking konseling Seraya.">${loginStyles}</head><body><main><h1>Masuk untuk melanjutkan booking</h1><p class="meta">Login Google diperlukan agar data booking dan konfirmasi tetap terhubung ke akunmu${returnHint}.</p>${error}<div class="login-card"><a class="cta" href="/auth/google?return_to=${encodeURIComponent(args.returnTo)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/></svg> Lanjutkan dengan Google</a><p class="meta">Satu langkah singkat. Seraya tidak menyimpan password.</p></div><p class="esc"><a href="/privacy">Kebijakan Privasi</a> · <a href="/safety/crisis">Bantuan darurat</a></p></main></body></html>`;
}

export function renderClientProfile(args: {
  email: string;
  profile?: Record<string, unknown>;
  returnTo?: string;
  error?: string;
}): string {
  const profile = args.profile ?? {};
  const error = args.error
    ? `<div class="warning" role="alert" tabindex="-1">${escapeHtml(args.error)}</div>`
    : "";
  const input = (label: string, name: string, type = "text", attrs = "") =>
    `<div class="profile-field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${valueOf(profile, name)}" required ${attrs}></div>`;
  const select = (label: string, name: string, options: string[]) =>
    `<div class="profile-field"><label for="${name}">${label}</label><select id="${name}" name="${name}" required><option value="">Pilih ${label.toLowerCase()}</option>${options
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}" ${String(profile[name] ?? "") === option ? "selected" : ""}>${escapeHtml(option)}</option>`,
      )
      .join("")}</select></div>`;
  const submitScript = `<script>document.addEventListener('submit',function(e){var f=e.target;if(f&&f.tagName==='FORM'&&f.querySelector('button[type=submit]')){var b=f.querySelector('button[type=submit]');b.disabled=true;b.setAttribute('aria-busy','true');b.dataset.label=b.textContent;b.textContent='Menyimpan...'}},true);</script>`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Profil Saya — Seraya Psikologi</title>${profileStyles}</head><body><main class="profile-shell"><div class="profile-header"><a href="/"><img src="/static/logo.jpeg" alt="Logo Seraya Psikologi"></a><div><a href="/">Seraya Psikologi</a><div><small>Akun Google: ${escapeHtml(args.email)}</small></div></div></div><h1>Profil Saya</h1><p>Lengkapi data ini sekali sebelum memilih jadwal konseling.</p>${error}<div class="profile-note">${fieldHelp}</div><form method="post" action="/client/profile"><input type="hidden" name="returnTo" value="${escapeHtml(args.returnTo ?? "/book")}"><section class="profile-card"><h2>Profil Saya</h2><p>Informasi dasar untuk kebutuhan layanan dan komunikasi.</p><div class="profile-grid">${input("Nama Panggilan", "namaPanggilan", "text", "maxlength=50")}${input("Tanggal Lahir", "dateOfBirth", "date")}${select("Jenis Kelamin", "jenisKelamin", ["Laki-laki", "Perempuan"])}${input("Pekerjaan", "pekerjaan", "text", "maxlength=100")}${select("Pendidikan", "pendidikan", ["SMA/SMK", "Diploma (D3/D4)", "Sarjana (S1)", "Magister (S2)", "Doktor (S3)", "Lainnya"])}${input("No. WhatsApp", "contactPhone", "tel", "placeholder=08123456789")}${select("Status", "statusPernikahan", ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"])}${select("Agama", "agama", ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Konghucu", "Penghayat Kepercayaan", "Lainnya"])}</div></section><section class="profile-card"><h2>Alamat Saya</h2><p>Alamat digunakan untuk kebutuhan administrasi layanan offline.</p><div class="profile-grid">${input("Negara", "negara", "text", "maxlength=80")}${input("Provinsi", "provinsi", "text", "maxlength=100")}${input("Kota atau Kabupaten", "kotaKabupaten", "text", "maxlength=100")}${input("Alamat", "alamatLengkap", "text", "maxlength=300")}</div></section><div class="profile-actions"><a href="/auth/logout">Keluar</a><button type="submit">Simpan Profil</button></div></form>${submitScript}</main></body></html>`;
}

export {};
