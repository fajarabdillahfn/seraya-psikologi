/**
 * Inline HTML view helpers — minimal SSR for the MVP.
 * Real CSS lives in `app/public/css/main.css` (placeholder, deployed via
 * the Worker static asset route). For the MVP demo we inline the small
 * stylesheet so the Worker has no external assets to serve.
 */

const BASE_STYLES = `
  :root { --brand: #315c57; --warm: #f3e9d2; --ink: #2a2a2a; --muted: #6b6b6b; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); max-width: 880px; margin: 0 auto; padding: 1.5rem; line-height: 1.6; }
  header { padding: 1rem 0 2rem; }
  header a { color: var(--brand); text-decoration: none; margin-right: 1rem; font-weight: 500; }
  h1 { color: var(--brand); font-size: 1.8rem; }
  h2 { color: var(--brand); font-size: 1.3rem; margin-top: 2rem; }
  .hero { background: var(--warm); padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
  .cta { display: inline-block; background: var(--brand); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; }
  .cta-secondary { display: inline-block; border: 2px solid var(--brand); color: var(--brand); padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; margin-right: 0.5rem; }
  .card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; }
  .price { font-size: 1.2rem; font-weight: 600; color: var(--brand); }
  .crisis { background: #fff5f0; border: 2px solid #b85b3a; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 0.5rem; border-bottom: 1px solid #eee; text-align: left; }
  footer { border-top: 1px solid #eee; margin-top: 3rem; padding-top: 1rem; font-size: 0.9rem; color: var(--muted); }
  small.muted { color: var(--muted); }
  .warning { background: #fff5f0; border-left: 4px solid #b85b3a; padding: 0.75rem 1rem; margin: 1rem 0; }
  .success { background: #f0f7f4; border-left: 4px solid var(--brand); padding: 0.75rem 1rem; margin: 1rem 0; }
`;

const base = (title: string, body: string) =>
  `<!doctype html><html lang="id"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} — Seraya Psikologi</title>
    <style>${BASE_STYLES}</style>
  </head><body>
    <header>
      <a href="/">Beranda</a>
      <a href="/pulang">SERAYA PULANG</a>
      <a href="/fuja">Fuja</a>
      <a href="/faq">FAQ</a>
      <a href="/admin">Admin</a>
    </header>
    <main>${body}</main>
    <footer>
      <p>Seraya Psikologi — bukan layanan kegawatdaruratan. <a href="/safety/crisis">Butuh bantuan segera?</a></p>
      <p><small class="muted"><a href="/privacy">Privasi</a> · <a href="/consent">Informed Consent</a> · <a href="/cancellation">Cancellation</a></small></p>
    </footer>
  </body></html>`;

export function renderHome(p: {
  launchPillar: string;
  psychologistName: string;
  priceOnlineSingle: string;
  priceOfflineSingle: string;
}): string {
  return base(
    "Beranda",
    `<section class="hero">
      <h1>Ruang untuk pulang ke diri sendiri</h1>
      <p>Seraya Psikologi mendampingi kamu memahami apa yang sedang kamu hadapi — dengan psikolog umum, online atau offline, dari ${p.priceOnlineSingle} per sesi.</p>
      <p><a class="cta" href="/pulang">Mulai dari SERAYA PULANG</a></p>
    </section>
    <section>
      <h2>Untuk apa Seraya?</h2>
      <div class="card">
        <p>Seraya membantu kamu dengan:</p>
        <ul>
          <li>Pengembangan diri dan pemahaman diri</li>
          <li>Pengelolaan emosi dan stres</li>
          <li>Kepercayaan diri dan self-esteem</li>
        </ul>
        <p>Kami tidak menangani kondisi yang membutuhkan psikolog klinis spesialis, psikiatri, atau kegawatdaruratan.</p>
      </div>
    </section>
    <section>
      <h2>Kenalan dengan ${p.psychologistName}</h2>
      <p>Fuja akan menemani sesi pertama kamu. Pendekatan hangat, empatik, dan bebas penghakiman.</p>
      <p><a class="cta-secondary" href="/fuja">Lihat profil Fuja</a> <a class="cta-secondary" href="/book">Booking sesi</a></p>
    </section>
    <section>
      <h2>Harga transparan</h2>
      <div class="card">
        <p><strong>Individual:</strong> online ${p.priceOnlineSingle} · offline ${p.priceOfflineSingle} (per sesi, 60 menit)</p>
        <p><strong>Paket:</strong> tersedia 2 dan 3 sesi dengan harga lebih hemat</p>
        <p><small class="muted">SERAYA BERDAYA, BERSAMA, BERBAGI — pilar program lain yang belum membuka booking di MVP.</small></p>
      </div>
    </section>
    <section>
      <h2>Bagaimana cara booking?</h2>
      <ol>
        <li>Pilih layanan dan slot yang tersedia</li>
        <li>Isi data minimum dan setujui informed consent</li>
        <li>Bayar via QRIS atau transfer bank — verifikasi otomatis</li>
        <li>Terima konfirmasi dan detail sesi lewat email</li>
      </ol>
    </section>`
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
      <p><a class="cta" href="/book/individual-online-single/intake">Booking sesi online</a></p>
    </div>
    <div class="card">
      <h2>Individual Offline</h2>
      <p class="price">Rp200.000 / sesi (60 menit)</p>
      <p><a class="cta" href="/book/individual-offline-single/intake">Booking sesi offline</a></p>
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
      <h2>Bidang اهتمام</h2>
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
      <p>Usia 18–40 tahun untuk self-service booking. Untuk usia 16–17, diperlukan persetujuan orang tua atau wali — hubungi Admin WhatsApp.</p>
    </section>
    <section class="card">
      <h2>Bagaimana cara pembayaran?</h2>
      <p>QRIS atau transfer bank / Virtual Account lewat Midtrans. Verifikasi otomatis.</p>
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
      <li>Identitas minimum: nama tampilan, email (wajib), nomor HP (opsional, hanya untuk dukungan WhatsApp manual).</li>
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
    <p><small class="muted">Waktu dalam Asia/Jakarta (WIB). Cutoff booking: minimal 1 jam sebelum sesi.</small></p>`
  );
}

export function renderBookingIntake(p: {
  offeringId: string;
  consentVersion: string;
}): string {
  return base(
    "Data Booking",
    `<h1>Data Booking</h1>
    <form method=POST action=/api/booking/create>
      <input type=hidden name=offeringId value="${p.offeringId}">
      <input type=hidden name=consentVersion value="${p.consentVersion}">
      <p><label>Nama lengkap (wajib)<br><input name=displayName required maxlength=120></label></p>
      <p><label>Email (wajib, untuk konfirmasi booking)<br><input name=contactEmail type=email required></label></p>
      <p><label>Nomor HP (opsional, format +62xxx)<br><input name=contactPhone placeholder="+628123456789"></label></p>
      <p><label>Pesan singkat (opsional, non-klinis, max 280 karakter)<br><textarea name=shortMessage maxlength=280 placeholder="Ceritakan situasi Anda secara singkat. Tidak untuk triage atau keluhan klinis."></textarea></label></p>
      <p><label><input type=checkbox name=crisisAck value=true required> Saya memahami bahwa Seraya bukan layanan kegawatdaruratan. Untuk kondisi krisis, saya akan menghubungi 119 atau IGD terdekat.</label></p>
      <p><label><input type=checkbox name=consentAck value=true required> Saya telah membaca dan menyetujui <a href="/consent" target=_blank>Informed Consent</a> dan <a href="/privacy" target=_blank>Kebijakan Privasi</a>.</label></p>
      <p><button class="cta" type=submit>Lanjut ke pembayaran</button></p>
    </form>
    <p><small class="muted">Setelah submit, sistem akan membuat slot hold selama 10 menit dan mengarahkan ke pembayaran Midtrans.</small></p>`
  );
}

export function renderBookingConfirmation(p: {
  bookingId: string;
  expiresAt: string;
}): string {
  return base(
    "Booking Diterima",
    `<h1>Booking Diterima</h1>
    <div class="success">
      <p>Booking <code>${p.bookingId}</code> dibuat.</p>
      <p>Slot hold berlaku hingga <strong>${p.expiresAt}</strong>. Selesaikan pembayaran dalam waktu tersebut.</p>
      <p>(Integrasi Midtrans Snap adalah placeholder — TBC-PAY-01 closed untuk live onboarding.)</p>
    </div>
    <p><small class="muted">Konfirmasi dan detail sesi akan dikirim ke email Anda setelah pembayaran diverifikasi.</small></p>`
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