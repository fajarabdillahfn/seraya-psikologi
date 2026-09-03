/**
 * Inline HTML view helpers — minimal SSR for the MVP.
 * Real CSS lives in `app/public/css/main.css` (placeholder, deployed via
 * the Worker static asset route). For the MVP demo we inline the small
 * stylesheet so the Worker has no external assets to serve.
 */

const BASE_STYLES = `
  :root { --brand:#315c57; --brand-dark:#214542; --warm:#f3e9d2; --cream:#fcfaf5; --ink:#23302e; --muted:#66716f; --line:#dfe7e3; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; color:var(--ink); background:var(--cream); line-height:1.65; }
  .shell { max-width:1120px; margin:0 auto; padding:0 24px; }
  header { padding:18px 0; border-bottom:1px solid var(--line); background:rgba(252,250,245,.96); position:sticky; top:0; z-index:2; }
  .nav { display:flex; align-items:center; justify-content:space-between; gap:20px; }
  .brand { display:flex; align-items:center; gap:10px; color:var(--brand-dark); text-decoration:none; font-weight:800; }
  .brand img { width:42px; height:42px; object-fit:contain; border-radius:10px; background:white; }
  nav { display:flex; align-items:center; flex-wrap:wrap; gap:4px; }
  nav a { color:var(--brand-dark); text-decoration:none; padding:8px 10px; border-radius:8px; font-size:.95rem; }
  nav a:hover,nav a:focus-visible { background:var(--warm); outline:none; }
  main { padding:44px 0; min-height:65vh; }
  h1,h2,h3 { color:var(--brand-dark); line-height:1.2; letter-spacing:-.025em; }
  h1 { font-size:clamp(2.1rem,5vw,4.5rem); max-width:780px; margin:0 0 18px; }
  h2 { font-size:clamp(1.35rem,3vw,2rem); margin-top:34px; }
  .hero { background:linear-gradient(135deg,var(--warm),#fffdf8); padding:clamp(28px,6vw,72px); border-radius:24px; margin-bottom:44px; }
  .hero p { max-width:650px; font-size:1.1rem; color:var(--muted); }
  .cta { display:inline-block; background:var(--brand); color:#fff; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:750; box-shadow:0 5px 14px rgba(49,92,87,.18); }
  .cta:hover,.cta:focus-visible { background:var(--brand-dark); }
  .cta-secondary { display:inline-block; border:1px solid var(--brand); color:var(--brand-dark); padding:10px 15px; border-radius:10px; text-decoration:none; margin:4px 6px 4px 0; font-weight:650; }
  .grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:16px; padding:22px; margin-bottom:16px; box-shadow:0 8px 24px rgba(35,48,46,.04); }
  .price { font-size:1.25rem; font-weight:800; color:var(--brand); }
  .crisis { background:#fff5f0; border:2px solid #e6aa96; color:#5e3025; padding:18px; border-radius:14px; margin:18px 0; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); }
  th,td { padding:11px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
  footer { border-top:1px solid var(--line); padding:28px 0 40px; font-size:.9rem; color:var(--muted); }
  small.muted { color:var(--muted); }
  .warning { background:#fff8e8; border-left:4px solid #c48727; padding:12px 16px; margin:16px 0; border-radius:0 10px 10px 0; }
  .success { background:#eef8f3; border-left:4px solid var(--brand); padding:12px 16px; margin:16px 0; border-radius:0 10px 10px 0; }
  .skip-link { position:absolute; left:-999px; top:8px; background:#fff; color:var(--brand-dark); padding:10px 14px; z-index:10; border-radius:8px; }
  .skip-link:focus { left:8px; }
  .nav-link { position:relative; }
  .menu-panel { position:absolute; top:calc(100% + 10px); right:0; width:360px; padding:14px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 14px 34px rgba(35,48,46,.14); opacity:0; pointer-events:none; transform:translateY(-6px); transition:opacity .15s ease,transform .15s ease; }
  .nav-link:focus-within .menu-panel,.nav-link:hover .menu-panel { opacity:1; pointer-events:auto; transform:translateY(0); }
  .menu-panel a { display:block; padding:12px; margin:2px 0; }
  .menu-panel strong { display:block; color:var(--brand-dark); }
  .menu-panel small { display:block; color:var(--muted); margin-top:2px; }
  .hero-split { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr); align-items:center; gap:36px; }
  .hero-art { min-height:320px; display:grid; place-items:center; background:radial-gradient(circle at 50% 45%,#fff 0 18%,transparent 19%),linear-gradient(145deg,#e4f2ed,#f8ead0); border-radius:28px; overflow:hidden; position:relative; }
  .hero-art:after { content:""; position:absolute; inset:22px; border:1px solid rgba(49,92,87,.15); border-radius:22px; }
  .hero-art img { width:min(44%,190px); aspect-ratio:1; object-fit:cover; border-radius:50%; position:relative; z-index:1; box-shadow:0 18px 34px rgba(49,92,87,.18); }
  .hero-orbit { position:absolute; border:1px solid rgba(49,92,87,.22); border-radius:50%; }
  .orbit-one { width:72%; aspect-ratio:1; }
  .orbit-two { width:88%; aspect-ratio:1; border-style:dashed; transform:rotate(22deg); }
  .hero-caption { position:absolute; bottom:24px; z-index:1; text-align:center; color:var(--brand-dark); font-size:.82rem; font-weight:700; line-height:1.35; }
  .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:.76rem; font-weight:800; color:var(--brand); }
  .trust-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
  .trust-pill { padding:8px 11px; border:1px solid var(--line); border-radius:999px; background:rgba(255,255,255,.7); font-size:.84rem; color:var(--brand-dark); }
  .section-intro { max-width:680px; color:var(--muted); }
  .service-card { display:flex; flex-direction:column; min-height:250px; }
  .service-card .cta-secondary { margin-top:auto; align-self:flex-start; }
  .stepper { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; counter-reset:step; }
  .step { position:relative; padding:18px; background:#fff; border:1px solid var(--line); border-radius:14px; }
  .step:before { counter-increment:step; content:counter(step); display:grid; place-items:center; width:30px; height:30px; border-radius:50%; background:var(--warm); color:var(--brand-dark); font-weight:800; margin-bottom:12px; }
  .quote-card { background:var(--brand-dark); color:#fff; border-radius:18px; padding:26px; }
  .quote-card h2,.quote-card p { color:#fff; }
  @media (max-width:720px) { .shell{padding:0 16px} header{position:static} .nav{align-items:flex-start; flex-direction:column; gap:10px} nav{width:100%} .menu-panel{position:static;width:100%;margin-top:8px;display:none} .nav-link:hover .menu-panel,.nav-link:focus-within .menu-panel{display:block} main{padding:28px 0}.grid{grid-template-columns:1fr}.hero{border-radius:16px;padding:24px 18px}.hero-split{grid-template-columns:1fr;gap:24px}.hero-art{min-height:230px}.stepper{grid-template-columns:1fr} table{display:block;overflow-x:auto;white-space:nowrap} }
`;

const base = (title: string, body: string) =>
  `<!doctype html><html lang="id"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — Seraya Psikologi</title>
    <style>${BASE_STYLES}</style>
  </head><body><a class="skip-link" href="#main-content">Lewati ke konten utama</a><header><div class="shell nav">
      <a class="brand" href="/"><img src="/static/logo.jpeg" alt="Logo Seraya Psikologi"><span>Seraya Psikologi</span></a>
      <nav aria-label="Navigasi utama"><a href="/">Beranda</a><span class="nav-link"><a href="/layanan" aria-haspopup="true">Layanan</a><span class="menu-panel" role="menu"><a href="/pulang" role="menuitem"><strong>SERAYA PULANG · Tersedia</strong><small>Konseling individu via Chat, Call, atau tatap muka.</small></a><a href="/layanan#berdaya" role="menuitem"><strong>SERAYA BERDAYA · Segera hadir</strong><small>Ruang refleksi dan penguatan diri.</small></a><a href="/layanan#bersama" role="menuitem"><strong>SERAYA BERSAMA · Segera hadir</strong><small>Aktivitas kelompok dan komunitas.</small></a><a href="/layanan#berbagi" role="menuitem"><strong>SERAYA BERBAGI · Segera hadir</strong><small>Edukasi kesehatan mental untuk publik.</small></a></span></span><a href="/psikolog">List Psikolog</a><a href="/about">Tentang Seraya</a><a href="/faq">FAQ</a><a class="cta-secondary" href="/book">Booking Sesi</a></nav>
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
  return base(
    "SERAYA PULANG",
    `<h1>SERAYA PULANG</h1>
    <p class="lead">Konseling psikologi untuk membantu kamu pulang ke dirimu sendiri.</p>
    <div class="card">
      <h2>Individual Online</h2>
      <p class="price">Rp125.000 / sesi (60 menit)</p>
      <p><a class="cta" href="/book/individual-online-single/slots">Booking sesi online</a></p>
    </div>
    <div class="card">
      <h2>Individual Offline</h2>
      <p class="price">Rp200.000 / sesi (60 menit)</p>
      <p><a class="cta" href="/book/individual-offline-single/slots">Booking sesi offline</a></p>
    </div>
    <div class="card">
      <h2>Paket hemat</h2>
      <p>2 sesi online Rp235.000 · 3 sesi online Rp345.000</p>
      <p>2 sesi offline Rp380.000 · 3 sesi offline Rp555.000</p>
    </div>
    <div class="card">
      <h2>Couple counseling</h2>
      <p>3 sesi berurutan (partner A, partner B, joint). Online Rp350.000 · offline Rp550.000.</p>
      <p><small class="muted">Coming soon — participant model masih dalam penyelesaian.</small></p>
    </div>
    <div class="warning">
      <p><strong>Penting:</strong> Seraya bukan layanan kegawatdaruratan. Jika kamu dalam krisis, <a href="/safety/crisis">lihat halaman bantuan segera</a>.</p>
    </div>`
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

 export function renderFuja(p: {
  name: string;
  bio: string;
  expertise: string[];
  priceOnlineSingle: string;
  priceOfflineSingle: string;
}): string {
  return base(
    "Fuja Rahayu Kinanti",
    `<h1>${p.name}</h1>
    <p class="lead">Psikolog Umum. Pendekatan hangat, empatik, dan client-centered.</p>
    <section class="card">
      <h2>Tentang Fuja</h2>
      <p>${p.bio}</p>
    </section>
    <section class="card">
      <h2>Bidang yang ditangani</h2>
      <ul>${p.expertise.map((e) => `<li>${e}</li>`).join("")}</ul>
    </section>
    <section class="card">
      <h2>Sesi bersama Fuja</h2>
      <p>Online: <strong>${p.priceOnlineSingle}</strong> per sesi (60 menit)</p>
      <p>Offline: <strong>${p.priceOfflineSingle}</strong> per sesi (60 menit)</p>
      <p><a class="cta" href="/book">Booking sesi</a></p>
    </section>
    <section class="warning">
      <p><small class="muted">STR/SILP sudah diverifikasi sebelum publikasi. Placeholder foto: gunakan foto asli setelah proses Admin selesai.</small></p>
    </section>`
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
    `<h1>Jika kamu sedang membutuhkan bantuan segera</h1>
    <div class="crisis">
      <p>Tidak semua hal harus kamu hadapi sendiri. Ada kondisi tertentu yang membutuhkan bantuan langsung.</p>
      <p>Jika kamu merasa tidak aman, memiliki dorongan untuk menyakiti diri sendiri atau orang lain, atau merasa tidak mampu menjaga keselamatan dirimu, <strong>segera hubungi orang yang kamu percaya dan datangi IGD rumah sakit terdekat</strong>.</p>
      <p>Seraya bukan layanan kegawatdaruratan — kondisi seperti ini membutuhkan bantuan yang dapat hadir secara langsung.</p>
    </div>
    <h2>Sumber bantuan yang tersedia</h2>
    <ul>
      <li><strong>Hubungi 119</strong> atau datang ke IGD rumah sakit terdekat.</li>
      <li><strong>Sejiwa:</strong> 119 ext. 8 (Kemenkes RI)</li>
      <li><strong>Into The Light:</strong> 119 ext. 4</li>
      <li>Puskesmas dengan psikolog klinis</li>
      <li>Rumah Sakit Umum Daerah (RSUD) dengan poli psikologi / psikiatri</li>
    </ul>
    <p><small class="muted">Setelah kondisi lebih stabil, kami akan dengan senang hati menemanimu dalam proses selanjutnya. Untuk saat ini, pastikan kamu berada di tempat yang aman.</small></p>`
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
    <h2>1. Tujuan Layanan</h2>
    <p>Layanan psikologi SERAYA bertujuan membantu saya memahami kondisi dan permasalahan yang sedang saya hadapi, mengembangkan kemampuan diri, dan menemukan langkah yang lebih adaptif. Hasil layanan dapat berbeda pada setiap individu.</p>
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
}): string {
  const cards = p.services
    .map(
      (s) =>
        `<div class="card"><h2>${s.name}</h2><p class="price">${s.price}</p><p><a class="cta" href="/book/${s.id}/slots">Pilih slot</a></p></div>`
    )
    .join("");
  return base(
    "Pilih Layanan",
    `<h1>Pilih Layanan</h1>
    ${cards}
    <div class="warning">
      <p><small class="muted">Dengan melanjutkan, kamu akan diminta menyetujui informed consent dan mengkonfirmasi bahwa Seraya bukan layanan kegawatdaruratan.</small></p>
    </div>`
  );
}

export function renderBookingSlot(p: {
  offeringId: string;
  slots: { id: string; starts_at_utc: string; ends_at_utc: string }[];
}): string {
  const items = p.slots.length
    ? p.slots
        .map(
          (s) =>
            `<li><a href="/book/${p.offeringId}/intake?slot=${s.id}">${s.starts_at_utc} → ${s.ends_at_utc} (WIB)</a></li>`
        )
        .join("")
    : `<li><small class="muted">Belum ada slot terbuka. Coba lagi nanti atau hubungi Admin.</small></li>`;
  return base(
    "Pilih Slot",
    `<h1>Pilih Slot</h1>
    <ul>${items}</ul>
    <p><small class="muted">Waktu dalam Asia/Jakarta (WIB). Cutoff booking: minimal 2 jam sebelum sesi.</small></p>`
  );
}

export function renderBookingIntake(p: {
  offeringId: string;
  consentVersion: string;
  slotId?: string;
  returnTo?: string;
}): string {
  const returnTo = p.returnTo ?? "/book";
  return base(
    "Data Booking",
    `<h1>Data Booking</h1>
    <form method=POST action=/api/booking/create>
      <input type=hidden name=offeringId value="${p.offeringId}">
      <input type=hidden name=slotId value="${p.slotId ?? ""}">
      <input type=hidden name=returnTo value="${returnTo}">
      <input type=hidden name=consentVersion value="${p.consentVersion}">
      <p><label>Nama panggilan (wajib)<br><input name=displayName required maxlength=120></label></p>
      <p><label>Tanggal lahir (wajib, minimal 18 tahun)<br><input name=dateOfBirth type=date required></label></p>
      <p><label>Email (wajib, untuk konfirmasi booking)<br><input name=contactEmail type=email required></label></p>
      <p><label>Nomor WhatsApp (wajib, format Indonesia)<br><input name=contactPhone type=tel required placeholder="08123456789"></label></p>
      <fieldset><legend>Intake konseling</legend>
        <p><span>Topik yang ingin dibahas (wajib, bisa pilih beberapa)</span><br>
          <label><input type=checkbox name=topics value="Pengembangan diri" required> Pengembangan diri</label>
          <label><input type=checkbox name=topics value="Kecemasan dan stres"> Kecemasan dan stres</label>
          <label><input type=checkbox name=topics value="Relasi"> Relasi</label>
          <label><input type=checkbox name=topics value="Kepercayaan diri"> Kepercayaan diri</label>
        </p>
        <p><label>Deskripsi masalah (wajib, minimal 50 karakter)<br><textarea name=problemDescription minlength=50 maxlength=2000 required placeholder="Ceritakan situasi yang ingin dibahas, tanpa informasi kegawatdaruratan."></textarea></label></p>
        <p><label>Harapan dari sesi (wajib)<br><textarea name=expectedOutcome maxlength=1000 required></textarea></label></p>
        <p><span>Apakah kamu pernah menggunakan layanan Seraya? (wajib)</span><br><label><input type=radio name=returningClient value="yes" required> Ya</label> <label><input type=radio name=returningClient value="no"> Belum</label></p>
      </fieldset>
      <p><label><input type=checkbox name=crisisAck value=true required> Saya memahami bahwa Seraya bukan layanan kegawatdaruratan. Untuk kondisi krisis, saya akan menghubungi 119 atau IGD terdekat.</label></p>
      <p><label><input type=checkbox name=consentAck value=true required> Saya telah membaca dan menyetujui <a href="/consent" target=_blank>Informed Consent</a> dan <a href="/privacy" target=_blank>Kebijakan Privasi</a>.</label></p>
      <p><button class="cta" type=submit>Lanjut ke pembayaran</button></p>
    </form>
    <p><small class="muted">Setelah submit, sistem akan membuat slot hold selama 10 menit dan menampilkan instruksi pembayaran via WhatsApp (invoice PDF + nomor Admin).</small></p>`
  );
}

export function renderBookingConfirmation(p: {
  bookingId: string;
  expiresAt: string;
  whatsappMessage: string;
  adminWhatsapp: string;
  pdfDownloadPath: string;
}): string {
  // Escape user-derived content for safe embedding in HTML.
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const waUrl =
    "https://wa.me/" +
    p.adminWhatsapp.replace(/[^0-9]/g, "") +
    "?text=" +
    encodeURIComponent(p.whatsappMessage);

  return base(
    "Booking Diterima",
    `<h1>Booking Diterima</h1>
    <div class="success">
      <p>Booking <code>${esc(p.bookingId)}</code> dibuat.</p>
      <p>Slot hold berlaku hingga <strong>${esc(p.expiresAt)}</strong>. Selesaikan pembayaran dalam waktu tersebut.</p>
    </div>

    <h2>Cara Bayar via WhatsApp</h2>
    <div class="card">
      <p><strong>1. Lihat instruksi pembayaran:</strong> transfer sesuai nominal dan rekening/QRIS yang ditampilkan di bawah. Invoice resmi PDF dan teks tersedia setelah Admin memverifikasi pembayaran.</p>
      <p><strong>2. Kirim pembayaran</strong> sesuai instruksi transfer/QRIS sebelum batas waktu di atas.</p>
      <p><strong>3. Kirim bukti transfer</strong> (screenshot / foto struk) ke Admin Seraya via WhatsApp:</p>
      <p><a class="cta" href="${esc(waUrl)}" target="_blank" rel="noopener">Kirim bukti ke WhatsApp Admin</a></p>
      <p><small class="muted">Nomor Admin Seraya: <code>${esc(p.adminWhatsapp)}</code></small></p>
    </div>

    <h2>Pesan WhatsApp (siap kirim)</h2>
    <div class="card">
      <pre style="white-space: pre-wrap; font-family: inherit; background: #fafafa; padding: 0.75rem; border-radius: 6px; font-size: 0.9rem;">${esc(p.whatsappMessage)}</pre>
      <p><a class="cta-secondary" href="${esc(waUrl)}" target="_blank" rel="noopener">Buka WhatsApp dengan pesan ini</a></p>
    </div>

    <div class="warning">
      <p><small class="muted">Konfirmasi booking akan dikirim setelah Admin memverifikasi bukti pembayaran. Cancellation dan refund ditangani Admin — review case-by-case.</small></p>
    </div>`
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