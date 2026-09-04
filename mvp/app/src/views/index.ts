/**
 * Inline HTML view helpers — minimal SSR for the MVP.
 * Real CSS lives in `app/public/css/main.css` (placeholder, deployed via
 * the Worker static asset route). For the MVP demo we inline the small
 * stylesheet so the Worker has no external assets to serve.
 */

const BASE_STYLES = `
  :root {
    --brand:#2F6B5B; --brand-dark:#214542; --brand-tint:#E9F2EE;
    --accent:#C2410C; --accent-deep:#9A3412; --accent-tint:#FFF1E7;
    --warm:#F3E9D2; --cream:#FCFAF5; --background:var(--cream); --surface:#FFFFFF;
    --ink:#23302E; --muted:#66716F; --line:#DFE7E3;
    --success-tint:#EEF8F3; --warning-tint:#FFF8E8; --warning-border:#C48727; --warning-border-strong:#E6AA96;
    --crisis-tint:#FFF5F0; --crisis-border:#E6AA96; --crisis-ink:#5E3025;
    --step-active:var(--accent); --step-done:var(--brand); --step-pending:var(--line);
    --shadow-brand:0 5px 14px rgba(47,107,91,.18);
    --shadow-ink:0 8px 24px rgba(35,48,46,.04);
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--ink); background:var(--cream); line-height:1.65; }
  h1,h2,h3 { font-family:"Lora",Georgia,serif; color:var(--brand-dark); }
  a,button { font-family:inherit; }
  a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--brand); outline-offset:3px; border-radius:6px; }
  .skip-link { position:absolute; left:-999px; top:8px; background:var(--surface); color:var(--brand-dark); padding:10px 14px; z-index:10; border-radius:8px; }
  .skip-link:focus { left:8px; }
  .shell { max-width:1120px; margin:0 auto; padding:0 24px; }
  header { padding:18px 0; border-bottom:1px solid var(--line); background:rgba(252,250,245,.96); position:sticky; top:0; z-index:2; }
  .nav { display:flex; align-items:center; justify-content:space-between; gap:20px; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--brand-dark); text-decoration:none; font-weight:800; }
  .brand img { width:42px; height:42px; object-fit:contain; border-radius:10px; background:var(--surface); }
  nav { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
  nav a:not(.cta):not(.cta-secondary):not(.btn) { color:var(--brand-dark); text-decoration:none; padding:8px 10px; border-radius:8px; font-size:.95rem; }
  nav a:not(.cta):not(.cta-secondary):not(.btn):hover { background:var(--warm); }
  nav a:not(.cta):not(.cta-secondary):not(.btn):focus-visible { background:var(--warm); outline-offset:0; }
  main { padding:44px 0; min-height:65vh; }
  h1 { font-size:clamp(2.1rem,5vw,4.5rem); max-width:780px; margin:0 0 18px; line-height:1.14; letter-spacing:-.02em; }
  h2 { font-size:clamp(1.35rem,3vw,2rem); margin-top:34px; line-height:1.25; letter-spacing:-.015em; }
  .hero { background:linear-gradient(135deg,var(--warm),#FFFDF8); padding:clamp(28px,6vw,72px); border-radius:24px; margin-bottom:44px; }
  .hero p { max-width:650px; font-size:1.1rem; color:var(--muted); }
  .cta { display:inline-flex; align-items:center; gap:8px; background:var(--brand); color:#fff; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:750; box-shadow:var(--shadow-brand); border:0; cursor:pointer; min-height:44px; }
  .cta:hover,.cta:focus-visible { background:var(--brand-dark); }
  .cta-secondary { display:inline-flex; align-items:center; gap:8px; border:1px solid var(--brand); color:var(--brand-dark); padding:10px 15px; border-radius:10px; text-decoration:none; margin:4px 6px 4px 0; font-weight:650; min-height:44px; }
  .cta-secondary:hover { background:var(--brand-tint); }
  .btn { display:inline-flex; align-items:center; gap:8px; text-decoration:none; border-radius:10px; font-weight:700; padding:10px 16px; min-height:44px; }
  .btn-outline { background:transparent; color:var(--brand-dark); border:1.5px solid var(--brand); }
  .btn-outline:hover { background:var(--brand-tint); }
  .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:22px; margin-bottom:16px; box-shadow:var(--shadow-ink); }
  .price { font-size:1.25rem; font-weight:800; color:var(--brand); }
  .crisis { background:var(--crisis-tint); border:2px solid var(--crisis-border); color:var(--crisis-ink); padding:18px; border-radius:14px; margin:18px 0; }
  table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--line); }
  th,td { padding:11px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  footer { border-top:1px solid var(--line); padding:28px 0 40px; font-size:.9rem; color:var(--muted); }
  small.muted { color:var(--muted); }
  .warning { background:var(--warning-tint); border-left:4px solid var(--warning-border); padding:12px 16px; margin:16px 0; border-radius:0 10px 10px 0; }
  .success { background:var(--success-tint); border-left:4px solid var(--brand); padding:12px 16px; margin:16px 0; border-radius:0 10px 10px 0; }
  .nav-link { position:relative; }
  .nav-link > .menu-panel { position:absolute; top:calc(100% + 10px); left:0; width:360px; padding:14px; background:var(--surface); border:1px solid var(--line); border-radius:16px; box-shadow:0 14px 34px rgba(35,48,46,.14); opacity:0; pointer-events:none; transform:translateY(-6px); transition:opacity .15s ease,transform .15s ease; }
  .nav-link.is-open > .menu-panel, .nav-link:focus-within > .menu-panel { opacity:1; pointer-events:auto; transform:translateY(0); }
  .menu-panel a { display:block; padding:12px; margin:2px 0; border-radius:8px; }
  .menu-panel a:hover { background:var(--warm); }
  .menu-panel strong { display:block; color:var(--brand-dark); }
  .menu-panel small { display:block; color:var(--muted); margin-top:2px; }
  .hero-split { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); align-items:center; gap:36px; }
  .hero-art { min-height:320px; display:grid; place-items:center; background:radial-gradient(circle at 50% 45%,var(--surface) 0 18%,transparent 19%),linear-gradient(145deg,var(--brand-tint),var(--warm)); border-radius:28px; overflow:hidden; position:relative; }
  .hero-art:after { content:""; position:absolute; inset:22px; border:1px solid rgba(47,107,91,.15); border-radius:22px; }
  .hero-art img { width:min(44%,190px); aspect-ratio:1; object-fit:cover; border-radius:50%; position:relative; z-index:1; box-shadow:var(--shadow-brand); }
  .hero-orbit { position:absolute; border:1px solid rgba(47,107,91,.22); border-radius:50%; }
  .orbit-one { width:72%; aspect-ratio:1; }
  .orbit-two { width:88%; aspect-ratio:1; border-style:dashed; transform:rotate(22deg); }
  .hero-caption { position:absolute; bottom:24px; z-index:1; text-align:center; color:var(--brand-dark); font-size:.82rem; font-weight:700; line-height:1.35; }
  .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:.76rem; font-weight:800; color:var(--brand); }
  .trust-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
  .trust-pill { padding:8px 11px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.7); font-size:.84rem; color:var(--brand-dark); display:inline-flex; align-items:center; gap:6px; min-height:44px; }
  .section-intro { max-width:680px; color:var(--muted); }
  .service-card { display:flex; flex-direction:column; min-height:250px; }
  .service-card .cta-secondary { margin-top:auto; align-self:flex-start; }
  .stepper { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; counter-reset:step; }
  .step { position:relative; padding:18px; background:var(--surface); border:1px solid var(--line); border-radius:14px; }
  .step.is-done { background:var(--brand-tint); border-color:#CDE3D8; }
  .step.is-current { background:var(--accent-tint); border-color:var(--accent); box-shadow:0 0 0 2px rgba(194,65,12,.10) inset; }
  .step:before { counter-increment:step; content:counter(step); display:grid; place-items:center; width:30px; height:30px; border-radius:50%; background:var(--warm); color:var(--brand-dark); font-weight:800; margin-bottom:12px; }
  .step.is-done:before { background:var(--brand); color:#fff; }
  .step.is-current:before { background:var(--accent); color:#fff; }
  .step-current-label { display:block; font-size:11.5px; font-weight:800; color:var(--accent-deep); margin-bottom:6px; letter-spacing:.04em; }
  .quote-card { background:var(--brand-dark); color:#fff; border-radius:18px; padding:26px; }
  .quote-card h2,.quote-card p { color:#fff; }
  .profile-hero { display:grid; grid-template-columns:180px 1fr; gap:28px; align-items:center; padding:28px; background:linear-gradient(135deg,var(--brand-tint),var(--warm)); border-radius:22px; }
  .profile-avatar { display:grid; place-items:center; width:180px; height:180px; border-radius:50%; background:var(--surface); box-shadow:0 14px 30px rgba(47,107,91,.16); overflow:hidden; font-family:"Lora",Georgia,serif; font-size:48px; font-weight:600; color:var(--brand-dark); }
  .profile-avatar img { width:100%; height:100%; object-fit:cover; }
  .profile-role { color:var(--brand); font-weight:800; }
  .profile-bio { max-width:680px; color:var(--muted); font-size:1.05rem; }
  .profile-layout { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr); gap:18px; margin-top:18px; }
  .profile-sidebar { position:sticky; top:20px; align-self:start; }
  .service-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid var(--line); }
  .service-row:last-child { border-bottom:0; }
  .profile-credentials { margin-top:18px; }
  .breadcrumb { font-size:12.5px; color:var(--muted); margin-bottom:14px; }
  .breadcrumb a { color:var(--muted); text-decoration:none; }
  .breadcrumb a:hover { color:var(--brand-dark); }
  .helper-card { background:var(--brand-tint); border:1.5px dashed #C7D5CD; border-radius:16px; padding:18px; display:flex; align-items:center; gap:14px; }
  .helper-card .hl-icon { width:42px; height:42px; border-radius:12px; background:var(--surface); display:grid; place-items:center; color:var(--brand-dark); flex:none; }
  .helper-card h3 { margin:0 0 4px; font-size:16px; }
  .helper-card p { margin:0; font-size:12.8px; color:#4E635B; }
  .helper-card .btn { margin-left:auto; }
  .badge-verified { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; background:var(--brand-tint); color:var(--brand-dark); border-radius:999px; font-size:11.5px; font-weight:800; }
  .badge-verified svg { flex:none; }
  .hold-chip { display:inline-flex; align-items:center; gap:8px; background:var(--accent-tint); border:1px solid #F3D9C4; color:var(--accent-deep); font-weight:800; font-size:13px; border-radius:999px; padding:8px 13px; min-height:36px; }
  .hold-chip svg { flex:none; }
  .hold-chip.is-expired { background:var(--warning-tint); border-color:var(--warning-border); color:#6B4A2E; }
  .fieldset-card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:18px 18px 8px; margin-bottom:14px; }
  .fieldset-card h3 { margin:0 0 4px; font-size:17px; display:flex; align-items:center; gap:10px; }
  .fieldset-card .n { width:24px; height:24px; border-radius:50%; background:var(--brand-tint); color:var(--brand-dark); font-family:inherit; font-size:12px; font-weight:800; display:grid; place-items:center; flex:none; }
  .fieldset-card .n.is-current { background:var(--accent); color:#fff; }
  .fieldset-card .n.is-done { background:var(--brand); color:#fff; }
  .fieldset-card .hint { font-size:12.5px; color:var(--muted); margin:0 0 12px; }
  .status-pill { display:inline-flex; align-items:center; gap:6px; padding:5px 10px; background:var(--brand-tint); color:var(--brand-dark); border-radius:999px; font-size:11.5px; font-weight:800; }
  .status-pill svg { color:var(--brand); flex:none; }
  .topic-chips { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
  .topic-chip { display:inline-flex; align-items:center; gap:6px; border:1.5px solid var(--line); border-radius:999px; padding:8px 14px; font-size:13px; font-weight:600; color:var(--brand-dark); background:var(--surface); cursor:pointer; min-height:36px; }
  .topic-chip.is-selected { background:var(--brand); border-color:var(--brand); color:#fff; }
  .topic-chip input { position:absolute; opacity:0; pointer-events:none; }
  .checkline { display:flex; gap:10px; align-items:flex-start; padding:10px 0; font-size:13.5px; color:#43504B; }
  .checkline input { margin-top:3px; transform:scale(1.15); accent-color:var(--brand); }
  .sticky-action { display:flex; justify-content:space-between; align-items:center; gap:12px; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px 14px; box-shadow:0 -2px 18px -14px rgba(35,48,46,.4); position:sticky; bottom:12px; }
  pre { white-space:pre-wrap; font-family:inherit; background:var(--background); border:1px dashed var(--line); border-radius:10px; padding:12px; font-size:.92rem; }
  .meta-row { display:flex; gap:18px; flex-wrap:wrap; font-size:13px; color:var(--muted); margin:8px 0 18px; }
  .meta-row b { color:var(--brand-dark); font-weight:700; }
  .pay-card { background:var(--accent-tint); border:1px solid #F3D9C4; border-left:4px solid var(--accent); border-radius:16px; padding:22px; }
  .pay-card h2 { display:flex; align-items:center; gap:10px; color:var(--accent-deep); }
  .pay-step { display:flex; gap:12px; margin-bottom:14px; }
  .pay-step .n { width:26px; height:26px; border-radius:50%; background:var(--surface); border:1.5px solid var(--accent); color:var(--accent-deep); font-weight:800; font-size:13px; display:grid; place-items:center; flex:none; }
  .pay-step p { margin:2px 0 0; font-size:13.5px; }
  .pay-step a { color:var(--brand); }
  .amount-row { display:flex; justify-content:space-between; align-items:baseline; background:var(--surface); border:1px solid #F3D9C4; border-radius:12px; padding:12px 16px; margin-bottom:16px; }
  .amount-row b { font-size:20px; color:var(--accent-deep); font-family:"Lora",Georgia,serif; }
  .amount-row span { font-size:12.5px; color:var(--muted); }
  .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; }
  .form-grid > * { margin:10px 0; }
  label.form-field-label { font-weight:650; color:var(--muted-deep); display:block; margin-bottom:4px; }
  input[type=text],input[type=date],input[type=email],input[type=tel],input[type=number],textarea,select { width:100%; padding:9px 11px; border:1px solid var(--line); border-radius:9px; background:var(--surface); font:inherit; font-size:16px; color:var(--ink); min-height:44px; }
  textarea { min-height:96px; resize:vertical; }
  fieldset { border:1px solid #D8DCD7; border-radius:10px; padding:10px 12px 12px; margin:12px 0; }
  legend { font-size:13px; font-weight:700; color:#43504B; padding:0 6px; }
  .intake-recap { background:var(--brand-tint); border:1px solid #CDE3D8; border-radius:14px; padding:14px 16px; margin-bottom:18px; font-size:13.5px; color:var(--brand-dark); display:flex; gap:14px; flex-wrap:wrap; align-items:center; }
  .intake-recap small { color:#4E635B; font-weight:600; }
  @media (max-width:720px) { .profile-hero{grid-template-columns:1fr;text-align:center;padding:22px}.profile-avatar{width:132px;height:132px;margin:0 auto;font-size:36px}.profile-layout{grid-template-columns:1fr}.profile-sidebar{position:static}.profile-hero .cta{width:100%} .service-row{flex-wrap:wrap} }
  @media (max-width:720px) { .shell{padding:0 16px} header{position:static} .nav{align-items:flex-start; flex-direction:column; gap:10px} nav{width:100%} .nav-link > .menu-panel{position:static;width:100%;margin-top:8px;display:block;transform:none;opacity:1;pointer-events:auto} main{padding:28px 0}.grid{grid-template-columns:1fr}.hero{border-radius:16px;padding:24px 18px}.hero-split{grid-template-columns:1fr;gap:24px}.hero-art{min-height:230px}.stepper{grid-template-columns:1fr 1fr} table{display:block;overflow-x:auto;white-space:nowrap} .form-grid{grid-template-columns:1fr} .sticky-action{position:static;flex-wrap:wrap} }
  @media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:0.01ms !important;transition-duration:0.01ms !important}}
`;

const base = (title: string, body: string) =>
  `<!doctype html><html lang="id"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — Seraya Psikologi</title>
    <style>${BASE_STYLES}</style>
  </head><body><a class="skip-link" href="#main-content">Lewati ke konten utama</a><header><div class="shell nav">
      <a class="brand" href="/"><img src="/static/logo.jpeg" alt="Logo Seraya Psikologi"><span>Seraya Psikologi</span></a>
      <nav aria-label="Navigasi utama"><a href="/">Beranda</a><span class="nav-link" data-nav-trigger><a href="/layanan" aria-haspopup="true" aria-expanded="false">Layanan</a><span class="menu-panel" role="menu"><a href="/pulang" role="menuitem"><strong>SERAYA PULANG · Tersedia</strong><small>Konseling individu via Chat, Call, atau tatap muka.</small></a><a href="/layanan#berdaya" role="menuitem"><strong>SERAYA BERDAYA · Segera hadir</strong><small>Ruang refleksi dan penguatan diri.</small></a><a href="/layanan#bersama" role="menuitem"><strong>SERAYA BERSAMA · Segera hadir</strong><small>Aktivitas kelompok dan komunitas.</small></a><a href="/layanan#berbagi" role="menuitem"><strong>SERAYA BERBAGI · Segera hadir</strong><small>Edukasi kesehatan mental untuk publik.</small></a></span></span><a href="/psikolog">List Psikolog</a><a href="/about">Tentang Seraya</a><a href="/faq">FAQ</a><span id="account-actions" class="account-actions" style="margin-left:6px"><a class="btn btn-outline" style="padding:9px 14px;font-size:13.5px" href="/auth/login?return_to=%2Fbook">Masuk</a></span><a class="cta" style="margin-left:4px;padding:11px 16px;font-size:14px" href="/book">Booking Sesi</a></nav><script>(function(){var nav=document.querySelector('[data-nav-trigger]');if(!nav)return;var trigger=nav.querySelector('a');var panel=nav.querySelector('.menu-panel');var open=false;function toggle(){open=!open;nav.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',open?'true':'false');}trigger.addEventListener('click',function(e){if(window.matchMedia('(min-width:721px)').matches){e.preventDefault();toggle();}});document.addEventListener('click',function(e){if(!nav.contains(e.target)){open=false;nav.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');}});document.addEventListener('keydown',function(e){if(e.key==='Escape'&&open){open=false;nav.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');trigger.focus();}});})();fetch('/auth/status',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(s=>{if(!s||!s.authenticated)return;const el=document.getElementById('account-actions');if(el)el.innerHTML='<a class="btn btn-outline" style="padding:9px 14px;font-size:13.5px" href="/client/profile"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profil Saya</a> <a class="btn btn-accent-nav" style="background:transparent;color:var(--accent-deep);padding:9px 12px;font-size:13.5px;border-radius:10px;font-weight:650;text-decoration:none" href="/auth/logout">Keluar</a>';}).catch(()=>{});</script>
    </div></header>
    <main id="main-content"><div class="shell">${body}</div></main>
    <footer><div class="shell">
      <p>Seraya Psikologi — bukan layanan kegawatdaruratan. <a href="/safety/crisis">Butuh bantuan segera?</a></p>
      <p><small class="muted"><a href="/privacy">Privasi</a> · <a href="/consent">Informed Consent</a> · <a href="/cancellation">Cancellation</a></small></p>
    </div></footer>
  </body></html>`;

export function renderHome(p: {
  launchPillar: string;
  psychologistName: string;
  priceOnlineSingle: string;
  priceOfflineSingle: string;
}): string {
  return base(
    "Beranda",
    `<div class="hero hero-split">
      <div><p class="eyebrow">Ruang aman untuk berproses</p><h1>Ruang yang tenang untuk pulang ke diri sendiri.</h1>
      <p>Konseling individu bersama ${p.psychologistName}. Hadir melalui Chat, Call, atau tatap muka di Karangploso, Malang.</p>
      <p><a class="cta" href="/book">Mulai Konseling Sekarang →</a> <a class="cta-secondary" href="/pulang">Kenali Layanan</a></p>
      <div class="trust-row"><span class="trust-pill">✓ Sesi utuh 60 menit</span><span class="trust-pill">✓ Harga transparan</span><span class="trust-pill">✓ Tanpa catatan klinis di web</span></div></div>
      <div class="hero-art"><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><img src="/static/logo.jpeg" alt="Logo Seraya Psikologi"><span class="hero-caption">Ruang untuk berhenti sejenak,<br>lalu melangkah dengan lebih sadar.</span></div>
    </div>
    <section><p class="eyebrow">Kenapa Seraya?</p><h2>Tempat untuk memahami apa yang sedang kamu hadapi</h2><p class="section-intro">Kamu tidak harus punya semua jawaban sebelum mulai bercerita. Seraya menyediakan ruang konseling yang hangat, jelas, dan menghormati batas privasimu.</p>
      <div class="grid"><div class="card"><h3>Didengar tanpa dihakimi</h3><p>Datang dengan cerita dan ritmemu sendiri. Sesi dirancang sebagai ruang percakapan yang aman.</p></div><div class="card"><h3>Jelas sejak awal</h3><p>Durasi, pilihan mode, harga, dan langkah pembayaran dijelaskan sebelum kamu booking.</p></div><div class="card"><h3>Privasi dihormati</h3><p>Sistem menyimpan data operasional seperlunya dan tidak menyimpan catatan klinis sesi.</p></div></div>
    </section>
    <section><p class="eyebrow">Layanan peluncuran</p><h2>SERAYA PULANG</h2><p class="section-intro">Pilih cara bercerita yang paling nyaman untukmu. Semua sesi berlangsung 60 menit dan dibuka Senin–Minggu pada jadwal yang tersedia.</p>
      <div class="grid"><div class="card service-card"><p class="eyebrow">Online</p><h3>Chat</h3><p class="price">Rp99.000</p><p>Untuk kamu yang lebih nyaman menyusun kata lewat tulisan.</p><a class="cta-secondary" href="/book">Pilih Sesi Chat →</a></div><div class="card service-card"><p class="eyebrow">Online</p><h3>Call</h3><p class="price">Rp125.000</p><p>Percakapan dua arah dari tempat yang nyaman untukmu.</p><a class="cta-secondary" href="/book">Pilih Sesi Call →</a></div><div class="card service-card"><p class="eyebrow">Offline · Malang</p><h3>Tatap Muka</h3><p class="price">Rp200.000</p><p>Di Havana Park Blok H-3, Kepuharjo, Karangploso.</p><a class="cta-secondary" href="/book">Pilih Sesi Offline →</a></div></div>
    </section>
    <section class="quote-card"><p class="eyebrow" style="color:#f3e9d2">Bersama Fuja</p><h2>Berproses dengan psikolog yang mendengar tanpa menghakimi</h2><p>${p.psychologistName} mendampingi sesi dengan pendekatan hangat, empatik, dan client-centered.</p><p><a class="cta-secondary" style="border-color:#fff;color:#fff" href="/fuja">Lihat Profil Fuja</a> <a class="cta" style="background:#f3e9d2;color:#214542" href="/book">Jadwalkan Sesi →</a></p></section>
    <section><p class="eyebrow">Cara memulai</p><h2>Empat langkah sederhana</h2><div class="stepper"><div class="step"><h3>Pilih mode</h3><p>Chat, Call, atau Offline sesuai kebutuhanmu.</p></div><div class="step"><h3>Pilih jadwal</h3><p>Lihat slot yang tersedia dan pilih waktu yang cocok.</p></div><div class="step"><h3>Isi intake</h3><p>Ceritakan topik sesi dan setujui informed consent.</p></div><div class="step"><h3>Transfer & konfirmasi</h3><p>Kirim bukti ke WhatsApp Admin. Invoice resmi terbit setelah verifikasi.</p></div></div></section>
    <section><h2>Batas layanan kami</h2><div class="card"><p>Seraya melayani kebutuhan konseling individu non-darurat untuk usia 18 tahun ke atas. Seraya bukan layanan kegawatdaruratan, diagnosis psikiatri, atau layanan peresepan obat.</p><p><a class="cta-secondary" href="/safety/crisis">Butuh bantuan segera?</a> <a class="cta" href="/book">Booking Sesi</a></p></div></section>`
  );
}

export function renderPulang(p: { psychologistName: string }): string {
  // /pulang is now a thin primer; the real selection lives at /psikolog + /book.
  return base(
    "SERAYA PULANG",
    `<p class="eyebrow">SERAYA PULANG · Layanan konseling individu</p>
    <h1>Konseling individu untuk pulang ke dirimu sendiri.</h1>
    <p class="section-intro">Pilih psikolog yang paling cocok sebagai langkah pertama. Setelah itu kamu dapat melihat slot waktu dan memilih format sesimu (Chat, Call, atau Tatap Muka di Karangploso, Malang).</p>
    <p><a class="cta" href="/psikolog">Lihat psikolog Seraya →</a> &nbsp; <a class="btn btn-outline" href="/book">Buka alur booking</a></p>
    <div class="card" style="margin-top:28px">
      <h2>Format sesi</h2>
      <div class="service-row"><div><strong>Chat</strong><br><small class="muted">Online · 60 menit</small></div><strong>Rp99.000</strong></div>
      <div class="service-row"><div><strong>Call</strong><br><small class="muted">Online · 60 menit</small></div><strong>Rp125.000</strong></div>
      <div class="service-row"><div><strong>Tatap Muka</strong><br><small class="muted">Karangploso · 60 menit</small></div><strong>Rp200.000</strong></div>
    </div>
    <div class="warning"><p>Seraya bukan layanan kegawatdaruratan. Jika kamu dalam krisis, <a href="/safety/crisis">lihat halaman bantuan segera</a>.</p></div>`,
  );
}

export function renderServicesPage(): string {
  return base("Layanan", `<p class="eyebrow">Layanan Seraya</p><h1>Pilih ruang yang paling nyaman untukmu.</h1>
    <p class="section-intro">Saat ini Seraya membuka satu layanan: konseling individu melalui SERAYA PULANG. Program lain sedang kami siapkan dengan tenang.</p>
    <section class="card"><p class="eyebrow">Tersedia sekarang</p><h2>SERAYA PULANG</h2><p>Konseling individu 1-on-1 bersama Fuja Rahayu Kinanti, S.Psi., Psikolog. Durasi setiap sesi 60 menit.</p><div class="grid"><div class="card service-card"><h3>Chat</h3><p class="price">Rp99.000</p><p>Untuk kamu yang lebih nyaman menulis.</p><a class="cta-secondary" href="/book">Lihat jadwal Chat →</a></div><div class="card service-card"><h3>Call</h3><p class="price">Rp125.000</p><p>Percakapan suara atau video dari tempatmu.</p><a class="cta-secondary" href="/book">Lihat jadwal Call →</a></div><div class="card service-card"><h3>Tatap Muka</h3><p class="price">Rp200.000</p><p>Havana Park Blok H-3, Kepuharjo, Karangploso.</p><a class="cta-secondary" href="/book">Lihat jadwal Offline →</a></div></div></section>
    <section><p class="eyebrow">Segera hadir</p><h2>Pilar Seraya lainnya</h2><div class="grid"><div class="card"><h3>SERAYA BERDAYA</h3><p>Ruang edukasi mandiri dan refleksi pribadi.</p><span class="trust-pill">Segera hadir</span></div><div class="card"><h3>SERAYA BERSAMA</h3><p>Aktivitas kelompok dan ruang bertumbuh bersama.</p><span class="trust-pill">Segera hadir</span></div><div class="card"><h3>SERAYA BERBAGI</h3><p>Wawasan kesehatan mental untuk masyarakat luas.</p><span class="trust-pill">Segera hadir</span></div></div></section>`);
}

export function renderAboutPage(): string {
  return base("Tentang Seraya", `<p class="eyebrow">Tentang Seraya</p><h1>Kami percaya setiap cerita layak mendapat ruang.</h1>
    <p class="section-intro">Seraya Psikologi hadir sebagai ruang konseling yang hangat, terjangkau, dan jujur tentang batas layanan psikologi umum.</p>
    <section class="card"><h2>Mengapa Seraya ada?</h2><p>Memulai konseling tidak selalu mudah. Karena itu kami ingin membuat langkah pertama terasa lebih jelas: kamu tahu siapa yang mendampingi, berapa biayanya, bagaimana menjadwalkan sesi, dan bagaimana data kamu diperlakukan.</p><p>Seraya dibangun dengan pendekatan manusiawi—mendengarkan tanpa menghakimi, tanpa menjanjikan hasil instan, dan tanpa menyimpan catatan klinis di sistem website.</p></section>
    <section class="quote-card"><h2>Ruang aman bukan berarti tanpa batas.</h2><p>Kami melayani konseling individu non-darurat untuk usia 18 tahun ke atas. Jika kebutuhanmu berada di luar kompetensi layanan, kami akan menyarankan rujukan yang lebih tepat.</p></section>
    <section><h2>Nilai yang kami pegang</h2><div class="grid"><div class="card"><h3>Jelas</h3><p>Harga, durasi, proses booking, dan batas layanan dijelaskan sejak awal.</p></div><div class="card"><h3>Hangat</h3><p>Kamu boleh datang sebagai dirimu sendiri, dengan ritme yang terasa aman.</p></div><div class="card"><h3>Menjaga privasi</h3><p>Data hanya digunakan untuk kebutuhan layanan, booking, komunikasi, dan administrasi.</p></div></div></section>
    <section class="card"><h2>Mulai dari langkah kecil</h2><p>Kenali layanan peluncuran kami atau langsung pilih jadwal bersama Fuja.</p><a class="cta" href="/book">Booking Sesi →</a></section>`);
}

 export interface PsychologistCard {
  id: string;
  name: string;
  role: string;
  bio: string;
  expertise: readonly string[];
  education: readonly string[];
  bookable: boolean;
}

export type StepId = "jasa" | "jadwal" | "intake" | "bayar";
const STEP_LABELS: Record<StepId, string> = {
  jasa: "Pilih layanan",
  jadwal: "Pilih jadwal",
  intake: "Data diri & topik",
  bayar: "Bayar via WhatsApp",
};

export function renderStepper(current: StepId): string {
  const order: StepId[] = ["jasa", "jadwal", "intake", "bayar"];
  const index = order.indexOf(current);
  return `<nav class="stepper" aria-label="Langkah booking">${order
    .map((step, i) => {
      const state = i < index ? "is-done" : i === index ? "is-current" : "";
      const label = i === index
        ? `<span class="step-current-label">Langkah ${i + 1} dari ${order.length} · ${STEP_LABELS[step]}</span>`
        : "";
      return `<div class="step ${state}" aria-current="${i === index ? "step" : "false"}">${label}<h3 style="font-size:15px;margin:0 0 4px">${STEP_LABELS[step]}</h3><p style="font-size:12.5px;color:var(--muted);margin:0">${
        ["Pilih mode dan psikolog", "Lihat slot waktu tersedia", "Isi biodata dan topik sesi", "Selesaikan pembayaran manual"][i]
      }</p></div>`;
    })
    .join("")}</nav>`;
}

function renderCountdown(expiresAtIso: string): string {
  const ts = Date.parse(expiresAtIso);
  if (Number.isNaN(ts)) return "";
  return `<span class="hold-chip" data-hold-expires="${ts}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span class="hold-time">Menghitung…</span></span>
  <script>(function(){var el=document.querySelector('[data-hold-expires]');if(!el)return;var exp=parseInt(el.dataset.holdExpires,10);var out=el.querySelector('.hold-time');function tick(){var ms=exp-Date.now();if(ms<=0){el.classList.add('is-expired');out.textContent='Hold telah kedaluwarsa — pilih ulang slot';return}var s=Math.floor(ms/1000);var m=Math.floor(s/60);var r=s%60;out.textContent='Slot ditahan · '+(m<10?'0':'')+m+':'+(r<10?'0':'')+r;}tick();var i=setInterval(tick,1000);})();</script>`;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function initialsOf(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter(Boolean)
    .filter((part) => !/^(S\.?Psi\.?|Dr\.?|M\.?Psi\.?|Psikolog)$/i.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function psychologistPhotoUrl(p: PsychologistCard): string {
  // Served directly from Cloudflare Assets (app/public/ at domain root).
  // `onerror` on the <img> falls back to the inner monogram — see
  // psychologistPortrait() — so a missing file degrades gracefully.
  return `/psychologists/${encodeURIComponent(p.id)}.jpeg`;
}

function psychologistPortrait(p: PsychologistCard, size: number): string {
  const initials = initialsOf(p.name);
  const url = psychologistPhotoUrl(p);
  return `<span class="profile-avatar" style="position:relative;width:${size}px;height:${size}px;font-size:${Math.round(size * 0.32)}px;color:transparent;flex:none">
    <img src="${esc(url)}" alt="Foto ${esc(p.name)}" loading="lazy" decoding="async" width="${size}" height="${size}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.remove();">
    ${esc(initials)}
  </span>`;
}

export function renderPsychologistList(psychologists: PsychologistCard[]): string {
  const cards = psychologists
    .map((p) => {
      const names = p.name.split(/,\s*/);
      const shortName = names[0]?.trim() ?? p.name;
      const credentials = names.slice(1).join(", ").trim();
      return `<article class="card service-card">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">
          ${psychologistPortrait(p, 56)}
          <div>
            <p class="eyebrow" style="font-size:10.5px">${esc(p.role)}</p>
            <h3 style="margin:0;font-size:18px">${esc(shortName)}</h3>
            ${credentials ? `<small class="muted" style="font-size:12px">${esc(credentials)}</small>` : ""}
          </div>
        </div>
        <p>${esc(p.bio)}</p>
        <div class="trust-row">${p.expertise
          .slice(0, 3)
          .map((x) => `<span class="trust-pill">${esc(x)}</span>`)
          .join("")}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
          <span class="status-pill"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg> Siap booking</span>
          <a class="cta-secondary" href="/psikolog/${esc(p.id)}">Lihat profil →</a>
        </div>
      </article>`;
    })
    .join("");
  return base(
    "List Psikolog",
    `<p class="eyebrow">Tim Psikolog Seraya</p>
    <h1>Temukan psikolog yang tepat untuk menemani prosesmu.</h1>
    <p class="section-intro">Kelima psikolog Seraya siap menerima booking konseling individu non-darurat. Pilih profil untuk melihat fokus pendampingan dan format sesi.</p>
    <section class="grid psychologist-grid">${cards}</section>
    <aside class="helper-card" aria-label="Bantuan memilih psikolog" style="margin-top:24px">
      <span class="hl-icon">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </span>
      <div><h3>Bingung pilih psikolog?</h3><p>Ceritakan kebutuhanmu — Admin Seraya akan bantu merekomendasikan pendamping yang cocok.</p></div>
      <a class="btn btn-outline" href="#" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Tanya Admin</a>
    </aside>
    <section class="warning" style="margin-top:24px"><p>Semua psikolog menggunakan harga dan lokasi layanan Seraya yang sama. Booking tersedia untuk usia 18 tahun ke atas dan kondisi non-darurat.</p></section>`,
  );
}

export function renderPsychologistProfile(p: PsychologistCard, args: { psychologistName?: string; serviceRows?: { mode: string; priceLabel: string; offeringId: string }[]; verified?: boolean }): string {
  const shortName = p.name.split(/,\s*/)[0]?.trim() ?? p.name;
  const credentials = p.name.split(/,\s*/).slice(1).join(", ").trim();
  const initials = initialsOf(p.name);
  const education = p.education.length
    ? `<section class="card"><p class="eyebrow">Pendidikan</p><h2>Latar belakang pendidikan</h2><ul>${p.education.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>`
    : "";
  const verifiedChip = args.verified
    ? `<span class="badge-verified"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Kredensial terverifikasi</span>`
    : "";
  const serviceRows = args.serviceRows ?? [
    { mode: "Chat", priceLabel: "Rp99.000", offeringId: "" },
    { mode: "Call", priceLabel: "Rp125.000", offeringId: "" },
    { mode: "Tatap Muka", priceLabel: "Rp200.000", offeringId: "" },
  ];
  const sidebarRows = serviceRows
    .map(
      (s) => `<div class="service-row">
        <div><strong>${esc(s.mode)}</strong><br><small class="muted">60 menit${s.mode === "Tatap Muka" ? " · Malang" : ""}</small></div>
        <span style="display:flex;gap:10px;align-items:center">
          <strong style="font-size:14px;color:var(--brand)">${esc(s.priceLabel)}</strong>
          ${s.offeringId
            ? `<a class="cta-secondary" style="margin:0;padding:8px 12px;font-size:13px" href="/book/${esc(s.offeringId)}/slots">Lihat jadwal</a>`
            : `<span class="muted" style="font-size:12.5px">Login dulu</span>`}
        </span>
      </div>`,
    )
    .join("");
  const topics = p.expertise
    .map((topic) => `<span class="trust-pill">${esc(topic)}</span>`)
    .join("");
  const breadcrumb = `<p class="breadcrumb"><a href="/psikolog">Psikolog</a> · ${esc(shortName)}</p>`;
  return base(
    "Profil Psikolog",
    `${breadcrumb}
    <section class="profile-hero">
      <div class="profile-avatar" style="position:relative;color:transparent">
        <img src="${esc(psychologistPhotoUrl(p))}" alt="Foto ${esc(p.name)}" width="180" height="180" loading="eager" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.remove();">
        ${esc(initials)}
      </div>
      <div>
        <p class="eyebrow">Profil Psikolog · Seraya Psikologi</p>
        <h1>${esc(shortName)}</h1>
        ${credentials ? `<p class="muted" style="font-weight:600;margin:6px 0 12px">${esc(credentials)}</p>` : ""}
        <p class="profile-role">${esc(p.role)} · Pendekatan hangat dan client-centered</p>
        ${verifiedChip}
        <p class="profile-bio" style="margin-top:12px">${esc(p.bio)}</p>
      </div>
    </section>
    <div class="trust-row"><span class="trust-pill"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg> Siap booking</span><span class="trust-pill">✓ Sesi individual</span><span class="trust-pill">✓ Durasi 60 menit</span></div>
    <aside class="helper-card" style="margin:18px 0 8px">
      <span class="hl-icon"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
      <div><h3>Tidak yakin ${esc(shortName)} cocok?</h3><p>Admin Seraya dapat membantu memilih psikolog berdasarkan topik yang ingin kamu bawa ke sesi.</p></div>
      <a class="btn btn-outline" href="#" rel="noopener"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Tanya Admin</a>
    </aside>
    <section class="profile-layout">
      <div>
        <section class="card"><p class="eyebrow">Tentang psikolog</p><h2>Ruang percakapan yang hangat dan terarah</h2><p>${esc(p.bio)}</p></section>
        <section class="card"><p class="eyebrow">Topik keahlian</p><h2>Hal yang bisa kamu bawa ke sesi</h2><div class="trust-row">${topics}</div></section>
        ${education}
      </div>
      <aside class="card profile-sidebar"><p class="eyebrow">Informasi layanan</p><h2>Format sesi</h2>${sidebarRows}<hr><p><strong>Durasi</strong><br>60 menit per sesi</p><p><strong>Lokasi tatap muka</strong><br>Havana Park Blok H-3<br>Kepuharjo, Karangploso, Malang</p></aside>
    </section>
    <section class="warning"><p>Seraya melayani konseling individu non-darurat untuk usia 18 tahun ke atas. Untuk kondisi krisis, <a href="/safety/crisis">cari bantuan darurat</a>.</p></section>`,
  );
}

export function renderFuja(p: {
  name: string;
  bio: string;
  expertise: string[];
  priceOnlineSingle?: string;
  priceOfflineSingle?: string;
  priceChat?: string;
  priceCall?: string;
}): string {
  const serviceRows = [
    { mode: "Chat", priceLabel: p.priceChat ?? "Rp99.000", offeringId: "" },
    { mode: "Call", priceLabel: p.priceCall ?? "Rp125.000", offeringId: "" },
    { mode: "Tatap Muka", priceLabel: p.priceOfflineSingle ?? "Rp200.000", offeringId: "" },
  ];
  return renderPsychologistProfile(
    {
      id: "fuja",
      name: p.name,
      role: "Psikolog Umum",
      bio: p.bio,
      expertise: p.expertise,
      education: [],
      bookable: true,
    },
    { serviceRows, verified: false },
  );
}

export function renderFaq(): string {
  return base(
    "FAQ",
    `<h1>Pertanyaan yang sering ditanyakan</h1>
    <section class="card">
      <h2>Apa yang akan saya alami di sesi pertama?</h2>
      <p>Sesi pertama adalah ruang untuk kamu bercerita dan berkenalan dengan psikolog. Tidak ada tes atau penilaian klinis.</p>
    </section>
    <section class="card">
      <h2>Berapa usia yang bisa melakukan booking?</h2>
      <p>Layanan launch hanya untuk klien berusia 18 tahun atau lebih. Jalur minor belum tersedia.</p>
    </section>
    <section class="card">
      <h2>Bagaimana cara pembayaran?</h2>
      <p>Transfer bank atau QRIS secara manual, lalu kirim bukti pembayaran ke Admin Seraya via WhatsApp. Admin akan memverifikasi dan mengkonfirmasi booking Anda.</p>
    </section>
    <section class="card">
      <h2>Bagaimana jika saya perlu cancel atau refund?</h2>
      <p>Cancellation dan refund ditangani oleh Admin via WhatsApp; review dilakukan case-by-case. <a href="/cancellation">Lihat kebijakan lengkap</a>.</p>
    </section>
    <section class="card">
      <h2>Apakah Seraya layanan kegawatdaruratan?</h2>
      <p>Bukan. Jika kamu dalam krisis, <a href="/safety/crisis">lihat halaman bantuan segera</a>.</p>
    </section>
    <section class="card">
      <h2>Apakah data saya aman?</h2>
      <p>Seraya tidak menyimpan catatan klinis atau diagnosis. Hanya data operasional minimum untuk booking dan komunikasi. <a href="/privacy">Baca kebijakan privasi</a>.</p>
    </section>`
  );
}

export function renderCrisisNotice(): string {
  return base(
    "Bantuan segera",
    `<h1>Jika kamu membutuhkan bantuan segera</h1>
    <div class="crisis">
      <p><strong>Pesan utama:</strong> Jika kamu merasa tidak aman, memiliki dorongan untuk menyakiti diri sendiri atau orang lain, atau merasa tidak mampu menjaga keselamatan dirimu — <strong>datangi IGD rumah sakit terdekat</strong> atau minta orang yang kamu percaya untuk menemanimu sekarang.</p>
      <p>Seraya adalah layanan konseling berjadwal. Kami bukan layanan kegawatdaruratan dan tidak bisa merespons dalam hitungan menit. Untuk situasi seperti di atas, butuh bantuan yang bisa hadir langsung.</p>
    </div>
    <h2>Hotline krisis Kemenkes RI</h2>
    <ul>
      <li><strong>Darurat umum & psikiatri:</strong> <a href="tel:119">119</a> (Kemenkes RI, 24 jam)</li>
      <li><strong>Sejiwa (dukungan bunuh diri):</strong> <a href="tel:119">119 ext. 8</a> (Kemenkes RI)</li>
      <li><strong>Datangi IGD rumah sakit terdekat</strong> untuk konsultasi langsung dengan psikiater atau psikolog klinis.</li>
    </ul>
    <h2>Sumber bantuan lain</h2>
    <ul>
      <li>Puskesmas dengan psikolog klinis</li>
      <li>Rumah Sakit Umum Daerah (RSUD) dengan poli psikologi atau psikiatri</li>
      <li>Konsultasi daring Kemenkes melalui <a href="https://www.healing119.id" rel="noopener noreferrer">healing119.id</a></li>
    </ul>
    <p><small class="muted">Setelah kondisi lebih stabil, kami dengan senang hati menemanimu dalam proses konseling. Untuk saat ini, utamakan keamananmu. <br>Daftar kontak krisis terakhir diverifikasi pada 4 September 2026.</small></p>`
  );
}

export function renderPrivacyNotice(): string {
  return base(
    "Privasi",
    `<h1>Kebijakan Privasi</h1>
    <p>Seraya Psikologi menyimpan data minimum yang dibutuhkan untuk booking, pembayaran, komunikasi, dan pencatatan consent. Kami tidak menyimpan catatan klinis, diagnosis, hasil asesmen, transkrip sesi, atau narrasi krisis.</p>
    <h2>Data yang kami simpan</h2>
    <ul>
      <li><strong>Profil klien:</strong> nama panggilan, tanggal lahir, jenis kelamin, pekerjaan, pendidikan, nomor WhatsApp, status, agama, dan alamat yang diperlukan untuk layanan.</li>
      <li><strong>Data invoice:</strong> hanya data minimum untuk identitas, kontak, layanan, jadwal, dan pembayaran; narasi intake tidak dicantumkan.</li>
      <li>Data booking: layanan, jadwal, mode, payment reference, consent version.</li>
      <li>Notifikasi: appointment reminder, status pembayaran.</li>
      <li>Audit: aksi privileged (Admin, psikolog, sistem).</li>
    </ul>
    <h2>Data yang tidak kami simpan</h2>
    <ul>
      <li>Catatan klinis, diagnosis, hasil asesmen, treatment.</li>
      <li>Transkrip sesi atau chat WhatsApp.</li>
      <li>Narasi krisis atau triase otomatis.</li>
    </ul>
    <h2>Retensi</h2>
    <p>Data klien/kontak disimpan selama 12 bulan setelah aktivitas layanan terakhir. Data pembayaran mengikuti kebijakan audit/legal yang berlaku. Setelah periode retensi, identifier langsung di-redact dan hanya referensi pseudonymous minimum yang dipertahankan untuk integritas transaksi/audit.</p>
    <p><small class="muted">Versi kebijakan: v1-2026-08-31. PLACEHOLDER — versi final tunduk pada sign-off klinis/etis dan teknis (TBC-CONSENT-01, TBC-PRIVACY-01).</small></p>`
  );
}

export function renderConsent(): string {
  return base(
    "Informed Consent",
    `<h1>Informed Consent Layanan Psikologi SERAYA</h1>
    <p>Dengan melanjutkan proses booking, saya menyatakan telah membaca, memahami, dan menyetujui ketentuan berikut:</p>
<h2>7. Kondisi Darurat</h2>
<p>Seraya bukan layanan kegawatdaruratan. Untuk krisis, saya perlu mencari bantuan darurat melalui hotline Kemenkes <a href="tel:119">119 ext. 8</a>, IGD rumah sakit terdekat, atau sumber bantuan lain yang tercantum di <a href="/safety/crisis">/safety/crisis</a>.</p>
    <h2>2. Sifat Sukarela</h2>
    <p>Saya mengikuti layanan secara sukarela dan dapat menyampaikan pertanyaan, ketidaknyamanan, atau mengakhiri proses sesuai ketentuan yang berlaku.</p>
    <h2>3. Kerahasiaan</h2>
    <p>Informasi yang saya sampaikan dijaga kerahasiaannya sesuai kode etik profesi psikologi dan peraturan perundang-undangan. Kerahasiaan dapat memiliki batas pada kondisi yang secara profesional/hukum mengharuskan informasi diberikan.</p>
    <h2>4. Data dan Dokumentasi</h2>
    <p>Data, hasil asesmen, dan informasi lain dapat didokumentasikan untuk kepentingan profesional, administrasi, evaluasi layanan, sesuai ketentuan etika dan hukum.</p>
    <h2>5. Batasan Layanan</h2>
    <p>Layanan SERAYA diberikan sesuai kompetensi Psikolog Umum. Apabila kebutuhan berada di luar kompetensi, psikolog dapat merekomendasikan rujukan.</p>
    <h2>6. Layanan Daring</h2>
    <p>Untuk sesi daring, terdapat kemungkinan kendala teknis. Saya bertanggung jawab memastikan tempat yang privat dan perangkat yang memadai.</p>
    <h2>7. Kondisi Darurat</h2>
    <p>Seraya bukan layanan kegawatdaruratan. Untuk krisis, saya perlu mencari bantuan darurat melalui IGD atau hotline 119.</p>
    <h2>8. Persetujuan</h2>
    <p>Dengan mencentang kotak persetujuan dan melanjutkan booking, saya menyatakan bahwa saya telah membaca, memahami, dan menyetujui informed consent ini.</p>
    <p><small class="muted">Versi consent: v1-2026-08-31. PLACEHOLDER — versi final tunduk pada sign-off klinis/etis (TBC-CONSENT-01).</small></p>`
  );
}

export function renderCancellationPolicy(): string {
  return base(
    "Cancellation & Refund",
    `<h1>Cancellation & Refund</h1>
    <p>Cancellation dan refund ditangani oleh Admin Seraya via WhatsApp; review dilakukan case-by-case.</p>
    <div class="card">
      <h2>Cara Mengajukan</h2>
      <p>Hubungi Admin Seraya melalui WhatsApp untuk mengajukan cancellation atau refund. Admin akan mencatat request dan memprosesnya.</p>
    </div>
    <div class="card">
      <h2>Yang Bisa Anda Harapkan</h2>
      <p>Admin akan meninjau kasus Anda, mengkonfirmasi jadwal dan efek terhadap booking/entitlement, lalu menentukan hasil <strong>full refund</strong> atau <strong>no refund</strong>. Refund dikirim dalam waktu hingga 7 hari kerja setelah disetujui.</p>
    </div>
    <div class="card">
      <h2>Catatan Penting</h2>
      <ul>
        <li>Tidak ada sistem self-service cancellation atau refund di website.</li>
        <li>Refund hanya melalui keputusan Admin; tidak ada refund parsial otomatis.</li>
        <li>Biaya admin atau transfer dari pihak ketiga adalah tanggungan internal Seraya.</li>
      </ul>
    </div>
    <div class="warning">
      <p><small class="muted">Kebijakan ini adalah placeholder implementasi. Detail final tunduk pada TBC-POLICY-01 dan TBC-CANCELLATION-PUBLIC-01 (locked 2026-08-31).</small></p>
    </div>`
  );
}

export function renderBookingOffer(p: {
  services: { id: string; name: string; price: string; mode: string }[];
  psychologistName?: string;
}): string {
  const cards = p.services
    .map(
      (s) => `<article class="card service-card">
        <p class="eyebrow" style="font-size:10.5px">${esc(s.mode)}</p>
        <h3 class="card-t">${esc(s.name)}</h3>
        <p class="price">${esc(s.price)}</p>
        <p style="font-size:13px;color:var(--muted)">Durasi 60 menit</p>
        <form method="get" action="/book/${esc(s.id)}/slots" style="margin-top:auto">
          <button type="submit" class="cta">Lihat jadwal ${esc(p.psychologistName ?? "")} →</button>
        </form>
      </article>`,
    )
    .join("");
  return base(
    "Pilih Layanan",
    `<p class="breadcrumb"><a href="/psikolog">Psikolog</a> · Pilih format sesi</p>
    ${renderStepper("jasa")}
    <h1 style="font-size:32px;margin-top:18px">Pilih format sesi${p.psychologistName ? ` bersama ${esc(p.psychologistName)}` : ""}</h1>
    <p class="section-intro">Pilih format yang paling nyaman. Setelah ini kamu akan melihat slot waktu yang tersedia dan slot otomatis ditahan selama 10 menit saat kamu memilihnya.</p>
    <section class="svc-grid" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:18px 0">
      ${cards}
    </section>
    <div class="warning">
      <p>Dengan melanjutkan, kamu akan diminta menyetujui informed consent dan mengkonfirmasi bahwa Seraya bukan layanan kegawatdaruratan.</p>
    </div>`,
  );
}

function formatJakartaDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function groupByDayJakarta(rows: { id: string; starts_at_utc: string; ends_at_utc: string }[]): { dayKey: string; label: string; items: { id: string; startLabel: string; rangeLabel: string }[] }[] {
  const fmtDay = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const fmtTime = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const groups = new Map<string, { label: string; items: { id: string; startLabel: string; rangeLabel: string }[] }>();
  for (const slot of rows) {
    const start = new Date(slot.starts_at_utc);
    const end = new Date(slot.ends_at_utc);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(start);
    if (!groups.has(dayKey)) groups.set(dayKey, { label: fmtDay.format(start), items: [] });
    groups.get(dayKey)!.items.push({
      id: slot.id,
      startLabel: fmtTime.format(start),
      rangeLabel: `${fmtTime.format(start)} – ${fmtTime.format(end)}`,
    });
  }
  return Array.from(groups.entries()).map(([dayKey, value]) => ({ dayKey, ...value }));
}

export function renderBookingSlot(p: {
  offeringId: string;
  slots: { id: string; starts_at_utc: string; ends_at_utc: string }[];
  hasSession: boolean;
  psychologistName?: string;
  serviceName?: string;
  priceLabel?: string;
}): string {
  const groups = groupByDayJakarta(p.slots);
  const items = groups.length
    ? groups
        .map(
          (g) => `
            <section class="slot-day" style="margin-top:18px">
              <h3 style="font-family:inherit;font-size:14.5px;color:var(--muted-deep);margin:0 0 8px;letter-spacing:.02em">${esc(g.label)}</h3>
              <div class="slot-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
                ${g.items
                  .map(
                    (s) => `<form method="post" action="/book/${esc(p.offeringId)}/slots" class="slot-form">
                    <input type="hidden" name="slotId" value="${esc(s.id)}">
                    <button type="submit" class="slot-btn" aria-label="Pilih slot ${esc(g.label)} pukul ${esc(s.rangeLabel)}">
                      <strong>${esc(s.startLabel)}</strong> <small>WIB</small>
                      <span class="muted">${esc(p.priceLabel ?? "")}</span>
                    </button>
                  </form>`,
                  )
                  .join("")}
              </div>
            </section>`,
        )
        .join("")
    : `<section class="card" style="margin-top:18px"><h3>Belum ada slot terbuka</h3><p>Coba lagi nanti atau hubungi Admin Seraya untuk konsultasi pilihan waktu.</p><a class="btn btn-outline" href="#" rel="noopener">Tanya Admin</a></section>`;
  const loginCta = p.hasSession
    ? ""
    : `<div class="warning" style="margin-top:14px"><p>Slot baru dapat dipilih setelah kamu login. Klik slot apa pun di atas untuk masuk terlebih dahulu.</p></div>`;
  const contextLine =
    p.psychologistName || p.serviceName
      ? `<div class="intake-recap"><small>Langkah selanjutnya</small><div>${esc(p.psychologistName ?? "")}${p.serviceName ? ` · ${esc(p.serviceName)}` : ""}${p.priceLabel ? ` · ${esc(p.priceLabel)}` : ""}</div></div>`
      : "";
  const slotBtnCss = `<style>.slot-btn{display:flex;flex-direction:column;align-items:flex-start;gap:4px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--brand-dark);font:inherit;text-align:left;cursor:pointer;min-height:64px;transition:background .15s ease,border-color .15s ease}.slot-btn small{font-size:11.5px;color:var(--muted);font-weight:600}.slot-btn .muted{font-size:11.5px;color:var(--brand);font-weight:800;letter-spacing:.03em}.slot-btn:hover{background:var(--brand-tint);border-color:var(--brand)}.slot-btn:focus-visible{outline:3px solid var(--brand);outline-offset:2px}</style>`;
  return base(
    "Pilih Slot",
    `${slotBtnCss}
    <p class="breadcrumb"><a href="/psikolog">Psikolog</a> · <a href="/book">Format sesi</a> · Pilih jadwal</p>
    ${renderStepper("jadwal")}
    <h1 style="font-size:30px;margin-top:18px">Pilih waktu yang cocok</h1>
    ${contextLine}
    ${items}
    ${loginCta}
    <p class="muted" style="margin-top:14px;font-size:12.8px">Waktu ditampilkan dalam Asia/Jakarta (WIB). Cutoff booking: minimal 2 jam sebelum sesi. Saat memilih slot, sistem akan menahannya selama 10 menit untuk kamu selesaikan pembayaran.</p>`,
  );
}

const TOPIC_CHIPS = [
  "Pengembangan diri",
  "Kecemasan dan stres",
  "Relasi",
  "Kepercayaan diri",
  "Pengelolaan emosi",
];

export function renderBookingIntake(p: {
  offeringId: string;
  consentVersion: string;
  slotId?: string;
  returnTo?: string;
  psychologistName?: string;
  serviceLabel?: string;
  slotLabel?: string;
  priceLabel?: string;
  holdExpiresAt?: string;
}): string {
  const returnTo = p.returnTo ?? "/book";
  const recap =
    p.psychologistName || p.serviceLabel || p.slotLabel
      ? `<div class="intake-recap">
          <small>Ringkasan booking</small>
          <div><b>${esc(p.psychologistName ?? "Psikolog Seraya")}</b> · ${esc(p.serviceLabel ?? "Sesi konseling")}</div>
          <div>${esc(p.slotLabel ?? "Slot belum dipilih")}${p.priceLabel ? ` · <b>${esc(p.priceLabel)}</b>` : ""}</div>
        </div>`
      : "";
  const countdown = p.holdExpiresAt ? renderCountdown(p.holdExpiresAt) : "";
  const submitScript = `<script>document.addEventListener('submit',function(e){var f=e.target;if(f&&f.id==='intake-form'){var b=f.querySelector('button[type=submit]');if(b){b.disabled=true;b.setAttribute('aria-busy','true');b.dataset.label=b.textContent;b.textContent='Memproses…'}}}},true);</script>`;
  return base(
    "Data Booking",
    `${renderStepper("intake")}
    <h1 style="font-size:30px;margin-top:18px">Lengkapi data &amp; topik sesi</h1>
    ${recap}
    <form id="intake-form" method="POST" action="/api/booking/create" novalidate>
      <input type="hidden" name="offeringId" value="${esc(p.offeringId)}">
      <input type="hidden" name="slotId" value="${esc(p.slotId ?? "")}">
      <input type="hidden" name="returnTo" value="${esc(returnTo)}">
      <input type="hidden" name="consentVersion" value="${esc(p.consentVersion)}">

      <section class="fieldset-card">
        <h3><span class="n">1</span>Data diri</h3>
        <p class="hint">Data ini dipakai untuk identifikasi dan komunikasi. Tidak ada catatan klinis yang disimpan di website.</p>
        <div class="form-grid">
          <div><label class="form-field-label" for="displayName">Nama panggilan</label><input id="displayName" name="displayName" required maxlength="120" autocomplete="name"></div>
          <div><label class="form-field-label" for="dateOfBirth">Tanggal lahir</label><input id="dateOfBirth" name="dateOfBirth" type="date" required></div>
          <div><label class="form-field-label" for="contactEmail">Email</label><input id="contactEmail" name="contactEmail" type="email" required autocomplete="email"></div>
          <div><label class="form-field-label" for="contactPhone">Nomor WhatsApp</label><input id="contactPhone" name="contactPhone" type="tel" required inputmode="tel" placeholder="08123456789" autocomplete="tel"></div>
        </div>
      </section>

      <section class="fieldset-card">
        <h3><span class="n">2</span>Topik sesi</h3>
        <p class="hint">Pilih satu atau beberapa topik. Topik yang kamu pilih membantu psikolog menyiapkan sesi pertama.</p>
        <div class="topic-chips" role="group" aria-label="Topik yang ingin dibahas">
          ${TOPIC_CHIPS.map(
            (topic) => `<label class="topic-chip"><input type="checkbox" name="topics" value="${esc(topic)}"> ${esc(topic)}</label>`,
          ).join("")}
        </div>
        <label class="form-field-label" for="problemDescription">Ceritakan situasi yang ingin dibahas</label>
        <textarea id="problemDescription" name="problemDescription" minlength="50" maxlength="2000" required placeholder="Minimal 50 karakter. Hindari informasi krisis atau identitas pihak ketiga."></textarea>
        <label class="form-field-label" for="expectedOutcome" style="margin-top:12px">Harapanmu dari sesi ini</label>
        <textarea id="expectedOutcome" name="expectedOutcome" maxlength="1000" required></textarea>
        <fieldset style="margin-top:14px"><legend>Apakah kamu pernah memakai layanan Seraya?</legend>
          <label><input type="radio" name="returningClient" value="yes" required> Ya</label>
          <label><input type="radio" name="returningClient" value="no"> Belum</label>
        </fieldset>
      </section>

      <section class="fieldset-card">
        <h3><span class="n">3</span>Persetujuan</h3>
        <p class="hint">Dua persetujuan terpisah. Keputusanmu untuk masing-masing Box adalah hal yang disengaja.</p>
        <label class="checkline"><input type="checkbox" name="crisisAck" value="true" required>
          <span>Saya memahami bahwa Seraya <strong>bukan layanan kegawatdaruratan</strong>. Untuk kondisi krisis saya akan menghubungi <a href="tel:119" rel="noopener">hotline Kemenkes 119 ext. 8</a> atau IGD rumah sakit terdekat.</span>
        </label>
        <label class="checkline"><input type="checkbox" name="consentAck" value="true" required>
          <span>Saya telah membaca dan menyetujui <a href="/consent" target="_blank" rel="noopener">Informed Consent</a> serta <a href="/privacy" target="_blank" rel="noopener">Kebijakan Privasi</a> Seraya.</span>
        </label>
      </section>

      <div class="sticky-action">
        ${countdown}
        <button class="cta" type="submit">Lanjut ke pembayaran <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></button>
      </div>
    </form>
    ${submitScript}`,
  );
}

export function renderBookingConfirmation(p: {
  bookingId: string;
  expiresAt: string;
  whatsappMessage: string;
  adminWhatsapp: string;
  pdfDownloadPath: string;
  amountLabel?: string;
}): string {
  const waUrl =
    "https://wa.me/" +
    p.adminWhatsapp.replace(/[^0-9]/g, "") +
    "?text=" +
    encodeURIComponent(p.whatsappMessage);
  const remainingHold = renderCountdown(p.expiresAt);

  return base(
    "Booking Diterima",
    `${renderStepper("bayar")}
    <h1 style="font-size:30px;margin-top:18px">Booking diterima</h1>
    <div class="success" style="display:flex;gap:14px;align-items:flex-start;background:var(--success-tint);border:1px solid #CDE3D8;border-radius:16px;padding:16px 18px;margin-bottom:18px">
      <span style="width:40px;height:40px;border-radius:50%;background:var(--brand);display:grid;place-items:center;color:#fff;flex:none">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
      </span>
      <div>
        <h2 style="font-size:18px;margin:0 0 4px">Kode booking <code style="font-family:ui-monospace,monospace;background:var(--surface);padding:1px 6px;border-radius:6px;border:1px solid #CDE3D8">${esc(p.bookingId)}</code></h2>
        <p style="margin:0;font-size:13.5px;color:#3E554D">Slot kamu ditahan sementara. Selesaikan pembayaran sebelum waktu jatuh tempo.</p>
      </div>
      <span style="margin-left:auto;flex:none">${remainingHold}</span>
    </div>

    <div style="display:grid;grid-template-columns:1.4fr .7fr;gap:18px">
      <section class="pay-card">
        <h2><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Cara bayar via WhatsApp</h2>
        <div class="amount-row"><span>Nominal yang ditransfer</span><b>${esc(p.amountLabel ?? "Rp125.000")}</b></div>
        <div class="pay-step"><span class="n">1</span><p>Transfer atau scan QRIS sesuai nominal di atas sebelum <strong>${esc(p.expiresAt)}</strong> (Asia/Jakarta).</p></div>
        <div class="pay-step"><span class="n">2</span><p>Screenshot atau foto bukti pembayaran kamu.</p></div>
        <div class="pay-step"><span class="n">3</span><p>Kirim bukti ke Admin Seraya. Invoice PDF resmi terbit setelah verifikasi.</p></div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">
          <a class="cta" style="background:var(--accent);justify-content:center;font-size:15.5px;padding:15px 22px;color:#fff" href="${esc(waUrl)}" target="_blank" rel="noopener">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Kirim bukti ke WhatsApp Admin
          </a>
          <a class="btn btn-outline" style="justify-content:center;border-color:#E4B697;color:var(--accent-deep)" href="${esc(waUrl)}" target="_blank" rel="noopener">Buka WhatsApp dengan pesan siap</a>
          <p style="font-size:12.5px;color:#8A6D5B;margin:2px 0 0;text-align:center">Nomor Admin: <code style="font-family:ui-monospace,monospace">${esc(p.adminWhatsapp)}</code></p>
        </div>
      </section>
      <aside class="card"><p class="eyebrow">Pesan siap kirim ke Admin</p>
        <pre>${esc(p.whatsappMessage)}</pre>
        <p class="muted" style="font-size:12px;margin:0">Konfirmasi booking resmi dikirim setelah Admin memverifikasi bukti pembayaranmu. Cancellation &amp; refund ditangani Admin — review case-by-case. <a href="/cancellation">Kebijakan lengkap</a>.</p>
      </aside>
    </div>

    <div class="warning" style="margin-top:24px"><p>Seraya bukan layanan kegawatdaruratan. Untuk kondisi krisis, <a href="/safety/crisis">lihat bantuan darurat</a> · hotline Kemenkes <a href="tel:119">119 ext. 8</a>.</p></div>`
  );
}

export function renderAdminBookingDetail(p: {
  bookingId: string;
  detail: unknown;
}): string {
  const detail = JSON.stringify(p.detail, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return base(
    `Booking ${p.bookingId}`,
    `<h1>Booking ${p.bookingId}</h1>
    <pre style="white-space: pre-wrap; font-size: 0.85rem; background: #fafafa; padding: 1rem; border-radius: 8px;">${detail}</pre>
    <p><small class="muted">Authorization placeholder — production requires Google SSO + StaffMembership + role check (ADR 0080/0081).</small></p>`
  );
}

/**
 * Admin payment queue — list all payment_proof rows awaiting verification.
 * ADR 0097. Each row links to the verify/reject form.
 */
export function renderAdminPaymentQueue(p: {
  pending: Array<{
    id: string;
    booking_id: string;
    client_name: string;
    payment_method: string;
    evidence_url: string | null;
    recorded_at: string;
    status: string;
  }>;
}): string {
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const rows = p.pending.length
    ? p.pending
        .map(
          (q) => `<tr>
        <td><code>${esc(q.id)}</code></td>
        <td>${esc(q.client_name)}</td>
        <td><code>${esc(q.booking_id)}</code></td>
        <td>${esc(q.payment_method)}</td>
        <td>${q.evidence_url ? `<a href="${esc(q.evidence_url)}" target="_blank" rel="noopener">buka</a>` : "—"}</td>
        <td>${esc(q.recorded_at)}</td>
        <td><a class="cta-secondary" href="/admin/payments/${esc(q.id)}/verify">review</a></td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="7"><small class="muted">Tidak ada payment proof yang menunggu verifikasi.</small></td></tr>`;

  return base(
    "Payment Queue",
    `<h1>Payment Queue (WhatsApp Manual)</h1>
    <p><small class="muted">ADR 0097 — bukti pembayaran dari klien yang dikirim via WhatsApp, menunggu verifikasi Admin.</small></p>
    <table border=1>
      <tr>
        <th>proof_id</th><th>client</th><th>booking</th><th>method</th>
        <th>evidence</th><th>recorded_at</th><th></th>
      </tr>
      ${rows}
    </table>
    <p><a href="/admin">← Admin Workspace</a></p>`
  );
}

/**
 * Admin mark-as-paid form — review a single payment_proof and either
 * verify (→ booking confirmed) or reject (→ booking cancelled).
 */
export function renderAdminPaymentVerify(p: {
  proof: {
    id: string;
    booking_id: string;
    payment_method: string;
    evidence_url: string | null;
    evidence_note: string | null;
    recorded_at: string;
    status: string;
  };
}): string {
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  return base(
    `Verify Payment ${p.proof.id}`,
    `<h1>Verify Payment</h1>
    <div class="card">
      <p><strong>Proof ID:</strong> <code>${esc(p.proof.id)}</code></p>
      <p><strong>Booking:</strong> <a href="/admin/bookings/${esc(p.proof.booking_id)}">${esc(p.proof.booking_id)}</a></p>
      <p><strong>Payment method:</strong> ${esc(p.proof.payment_method)}</p>
      <p><strong>Recorded at:</strong> ${esc(p.proof.recorded_at)}</p>
      <p><strong>Status:</strong> ${esc(p.proof.status)}</p>
      <p><strong>Evidence URL:</strong> ${p.proof.evidence_url ? `<a href="${esc(p.proof.evidence_url)}" target="_blank" rel="noopener">${esc(p.proof.evidence_url)}</a>` : "<em>(none)</em>"}</p>
      <p><strong>Evidence note:</strong> ${p.proof.evidence_note ? esc(p.proof.evidence_note) : "<em>(none)</em>"}</p>
    </div>

    <h2>Aksi</h2>
    <div class="card">
      <form method=POST action=/api/payment/manual/verify>
        <input type=hidden name=paymentProofId value="${esc(p.proof.id)}">
        <input type=hidden name=bookingId value="${esc(p.proof.booking_id)}">
        <p><label>Status:
          <select name=status>
            <option value=verified>verified — booking.confirmed</option>
            <option value=rejected>rejected — booking.cancelled</option>
          </select>
        </label></p>
        <p><label>Alasan penolakan (opsional untuk verified, wajib untuk rejected):
          <textarea name=reason placeholder="Misal: nominal transfer tidak sesuai, bukti tidak terbaca, dsb."></textarea>
        </label></p>
        <p><button class="cta" type=submit>Submit</button></p>
      </form>
    </div>

    <h2>Catatan</h2>
    <div class="warning">
      <p><small class="muted">Verifikasi bersifat idempotent — verifikasi ulang dengan status yang sama tidak mengubah state. Reject hanya dapat dilakukan dari status 'submitted'.</small></p>
    </div>

    <p><a href="/admin/payments">← Kembali ke queue</a></p>`
  );
}

/**
 * Admin record-payment form — manual entry when client did not upload
 * any evidence URL and the Admin received the screenshot via WhatsApp DM.
 */
export function renderAdminPaymentRecord(p: {
  bookingId: string;
}): string {
  return base(
    "Record Payment Proof",
    `<h1>Record Payment Proof</h1>
    <p><small class="muted">ADR 0097 — gunakan form ini ketika klien sudah mengirim bukti via WhatsApp tetapi tidak meng-upload URL bukti.</small></p>
    <form method=POST action=/api/payment/manual/record>
      <p><label>Booking ID <input name=bookingId value="${p.bookingId}" required></label></p>
      <p><label>Payment method
        <select name=paymentMethod>
          <option value=bank_transfer>bank_transfer</option>
          <option value=qris>qris</option>
          <option value=cash>cash</option>
        </select>
      </label></p>
      <p><label>Evidence URL (opsional) <input name=evidenceUrl placeholder="https://..."></label></p>
      <p><label>Evidence note (opsional) <textarea name=evidenceNote placeholder="Misal: nominal Rp125.000 dari BCA a.n. John, 2026-09-01"></textarea></label></p>
      <p><button class="cta" type=submit>Record</button></p>
    </form>
    <p><small class="muted">Setelah record, gunakan <a href="/admin/payments">payment queue</a> untuk verify/reject.</small></p>`
  );
}