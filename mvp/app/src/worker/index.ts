/**
 * Seraya Psikologi — Worker entry point.
 *
 * Implements:
 * - Public marketing surfaces (Home, SERAYA PULANG, About, Fuja profile, FAQ)
 * - Booking flow (offer selection, slot selection, intake, WhatsApp invoice, confirmation)
 * - ClientAccess (magic-link issuance, scoped session, booking view)
 * - Admin workspace (placeholder auth until TBC-STAFF-SESSION-01 closes)
 * - WhatsApp Manual Payment flow (ADR 0097):
 *     - invoice generation (PDF + text)
 *     - Admin payment proof record + verify/reject
 * - Cancellation/refund public route: NOT exposed. Routes go to 410 Gone
 *   with the "Admin WhatsApp" copy per Round 3 resolution.
 *
 * Authorization note (per user instruction): This MVP uses placeholder
 * auth for staff routes. Production must integrate Google SSO +
 * StaffMembership + role check (ADR 0080/0081). The placeholder is
 * gated behind a single env flag and documented in `docs/MVP-LIMITATIONS.md`.
 *
 * Migration from Midtrans (ADR 0097):
 * - The /api/payment/notification webhook route has been removed entirely.
 * - Booking now lands in 'pending_manual_payment' state; the Worker emits
 *   a WhatsApp invoice (PDF + text) and posts the booking to the Admin
 *   queue for manual verification.
 */

import { Hono } from "hono";
import { DomainError } from "../domain/types";
import { createAdapter } from "../persistence/d1-adapter";
import { CatalogModule } from "../modules/catalog";
import { AvailabilityModule } from "../modules/availability";
import { BookingModule, normalizeIndonesianPhone } from "../modules/booking";
import { ClientModule, profileInputFromForm } from "../modules/client";
import { ClientAuthModule, clearSessionCookie, exchangeGoogleCode, googleAuthorizationUrl, readCookie, safeReturnTo, sessionCookie } from "../modules/auth";
import { WhatsAppManualPaymentModule } from "../modules/payment";
import { AdminWorkspaceModule } from "../modules/admin";
import {
  renderHome,
  renderPulang,
  renderServicesPage,
  renderAboutPage,
  renderFuja,
  renderPsychologistList,
  renderPsychologistProfile,
  renderFaq,
  renderCrisisNotice,
  renderPrivacyNotice,
  renderConsent,
  renderCancellationPolicy,
  renderBookingOffer,
  renderBookingSlot,
  renderBookingIntake,
  renderBookingConfirmation,
  renderAdminBookingDetail,
  renderAdminPaymentQueue,
  renderAdminPaymentVerify,
  renderAdminPaymentRecord,
} from "../views/index";
import { renderClientLogin, renderClientProfile } from "../views/client-auth";

interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  ENVIRONMENT?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  EMAIL_PROVIDER_KEY?: string;      // PLACEHOLDER (TBC-NOTIFY-01)
  ALLOW_PLACEHOLDER_ADMIN_AUTH?: string; // 'true' enables /admin/* in dev only
  ADMIN_WHATSAPP_NUMBER?: string;   // e.g. "+6281234567890"
  SERAYA_BANK_NAME?: string;
  SERAYA_BANK_ACCOUNT?: string;
  SERAYA_BANK_HOLDER?: string;
  SERAYA_QRIS_IMAGE_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------

app.get("/static/logo.jpeg", async (c) => {
  const logo = await c.env.ASSETS?.fetch(new URL("/logo.jpeg", c.req.url));
  if (!logo?.ok) return c.notFound();
  return new Response(logo.body, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } });
});

// Psychologist portrait photos are served directly by Cloudflare Assets
// from `app/public/psychologists/<slug>.jpeg` at the domain root. The
// `psychologistPortrait()` view emits <img onerror> fallback chains, so
// missing files degrade gracefully without needing a worker handler.

app.get("/static/css/main.css", (c) => new Response("/* inline styles are used by the MVP */", {
  status: 200,
  headers: { "content-type": "text/css; charset=utf-8" },
}));

app.get("/healthz", (c) =>
  c.json({ status: "ok", environment: c.env.ENVIRONMENT ?? "unknown" })
);

// ---------------------------------------------------------------------------
// Client Google SSO and profile gate
// ---------------------------------------------------------------------------

app.get("/auth/status", async (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.json({ authenticated: false });
  const profile = await new ClientModule(adapter).getProfile(session.clientId);
  return c.json({ authenticated: true, profileComplete: Boolean(profile?.profileComplete), displayName: profile?.namaPanggilan || profile?.email || "Profil Saya" });
});

app.get("/auth/login", (c) => {
  const returnTo = safeReturnTo(c.req.query("return_to"));
  const error = c.req.query("error");
  return c.html(renderClientLogin({ returnTo, error }));
});

app.get("/auth/google", async (c) => {
  const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = c.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${new URL(c.req.url).origin}/auth/callback`;
  if (!clientId) return c.html(renderClientLogin({ returnTo: safeReturnTo(c.req.query("return_to")), error: "Login Google belum dikonfigurasi." }), 503);
  const auth = new ClientAuthModule(createAdapter({ DB: c.env.DB }));
  const state = await auth.createOAuthState(safeReturnTo(c.req.query("return_to")));
  return c.redirect(googleAuthorizationUrl({ clientId, redirectUri, state }));
});

app.get("/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const providerError = c.req.query("error");
  const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = c.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = c.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${new URL(c.req.url).origin}/auth/callback`;
  const requestId = crypto.randomUUID();
  if (providerError) {
    console.warn(JSON.stringify({ event: "oauth_callback_provider_error", requestId, providerError }));
    return c.redirect(`/auth/login?error=${encodeURIComponent("Login Google dibatalkan atau tidak diizinkan.")}`);
  }
  if (!code || !state || !clientId || !clientSecret) {
    console.error(JSON.stringify({
      event: "oauth_callback_missing_parameters",
      requestId,
      hasCode: Boolean(code),
      hasState: Boolean(state),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
    }));
    return c.redirect(`/auth/login?error=${encodeURIComponent("Login Google belum siap. Silakan hubungi Admin.")}`);
  }
  let stage = "database_state";
  try {
    const adapter = createAdapter({ DB: c.env.DB });
    const auth = new ClientAuthModule(adapter);
    const returnTo = await auth.consumeOAuthState(state);
    stage = "google_token_exchange";
    const identity = await exchangeGoogleCode({ code, clientId, clientSecret, redirectUri });
    stage = "client_profile";
    const client = await new ClientModule(adapter).findOrCreateGoogleClient({ googleSubject: identity.sub, email: identity.email, displayName: identity.name });
    stage = "session_creation";
    const session = await auth.createSession(client.id, returnTo);
    const headers = new Headers({ Location: client.profileComplete ? returnTo : `/client/profile?return_to=${encodeURIComponent(returnTo)}` });
    headers.append("Set-Cookie", sessionCookie(session.token));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const details = error instanceof DomainError
      ? { errorCode: error.code, errorMessage: error.message }
      : { errorName: error instanceof Error ? error.name : "UnknownError", errorMessage: error instanceof Error ? error.message : String(error) };
    // Never log code, state, tokens, client secrets, email, or redirect query
    // values. requestId lets an operator correlate this event in Wrangler tail.
    console.error(JSON.stringify({ event: "oauth_callback_failed", requestId, stage, redirectUri, ...details }));
    const safeReason = stage === "database_state"
      ? (error instanceof DomainError && error.code === "E-AUTH-INVALID-STATE"
        ? "state_not_found_or_expired"
        : error instanceof DomainError && error.code === "E-AUTH-STATE-READ"
          ? "oauth_state_read_failed"
          : error instanceof DomainError && error.code === "E-AUTH-STATE-DELETE"
            ? "oauth_state_delete_failed"
            : "database_query_failed")
      : stage;
    return c.redirect(`/auth/login?error=${encodeURIComponent(`Login Google gagal pada tahap ${safeReason}. Kode bantuan: ${requestId.slice(0, 8)}`)}`);
  }
});

app.get("/auth/logout", async (c) => {
  const auth = new ClientAuthModule(createAdapter({ DB: c.env.DB }));
  await auth.revokeSession(readCookie(c.req.raw, "seraya_session"));
  const headers = new Headers({ Location: "/" });
  headers.append("Set-Cookie", clearSessionCookie());
  return new Response(null, { status: 302, headers });
});

app.get("/client/profile", async (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(safeReturnTo(c.req.query("return_to")))}`);
  const profile = await new ClientModule(adapter).getProfile(session.clientId);
  if (!profile) return c.redirect("/auth/login?error=Profil%20tidak%20ditemukan");
  return c.html(renderClientProfile({ email: profile.email, profile: profile as unknown as Record<string, string>, returnTo: safeReturnTo(c.req.query("return_to"), "/book") }));
});

app.post("/client/profile", async (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect("/auth/login");
  const body = await c.req.parseBody();
  try {
    await new ClientModule(adapter).saveProfile(session.clientId, profileInputFromForm(body));
    return c.redirect(safeReturnTo(String(body.returnTo ?? "/book")));
  } catch {
    const profile = await new ClientModule(adapter).getProfile(session.clientId);
    return c.html(renderClientProfile({ email: profile?.email ?? "", profile: body as Record<string, string>, error: "Mohon periksa kembali data profil Anda." }), 400);
  }
});

// ---------------------------------------------------------------------------
// Public surfaces
// ---------------------------------------------------------------------------

app.get("/", (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  // Render synchronously with empty lists; client-side data fetch
  // populates the page. This keeps SSR simple for the MVP.
  return c.html(renderHome({
    launchPillar: "pulang",
    psychologistName: "Fuja Rahayu Kinanti, S.Psi., Psikolog",
    priceOnlineSingle: "Rp125.000",
    priceOfflineSingle: "Rp200.000",
  }));
});

app.get("/pulang", (c) =>
  c.html(renderPulang({
    psychologistName: "Fuja Rahayu Kinanti, S.Psi., Psikolog",
  }))
);

app.get("/layanan", (c) => c.html(renderServicesPage()));
app.get("/about", (c) => c.html(renderAboutPage()));

const psychologistProfiles = [
  { id: "fuja", name: "Fuja Rahayu Kinanti, S.Psi., Psikolog", role: "Psikolog Umum", bio: "Ruang konseling yang hangat untuk mengurai hal-hal yang terasa kusut dan menemukan langkah yang terasa tepat.", expertise: ["Kecemasan dan overthinking", "Pengembangan diri", "Pengelolaan emosi", "Relasi interpersonal"], education: ["Universitas Gadjah Mada — S1 Psikologi (2015)", "Universitas Muhammadiyah Malang — Pendidikan Profesi Psikolog (2026)"], bookable: true },
  { id: "daris", name: "Rahama Darus Salamah, S.Psi., Psikolog, CHt", role: "Psikolog Umum", bio: "Ruang yang hangat, aman, dan tidak menghakimi untuk merasa diterima, didengarkan, dan sedikit lebih lega menjadi diri sendiri.", expertise: ["Pengembangan diri", "Kepercayaan diri", "Pengelolaan emosi", "Relasi interpersonal"], education: ["Universitas Sebelas Maret — S1 Psikologi (2023)", "Universitas Muhammadiyah Malang — Pendidikan Profesi Psikolog (2026)"], bookable: true },
  { id: "zahra", name: "Zahratussyafiyah, S.Psi., Psikolog", role: "Psikolog Umum", bio: "Rekan perjalanan dan teman berdiskusi dalam ruang yang hangat, terbuka, dan penuh penerimaan.", expertise: ["Kecemasan dan overthinking", "Kesepian dan quarter-life crisis", "Kepercayaan diri", "Relasi interpersonal"], education: ["UIN Maulana Malik Ibrahim Malang — S1 Psikologi (2020)", "Universitas Muhammadiyah Malang — Pendidikan Profesi Psikolog (2026)"], bookable: true },
  { id: "hasanah", name: "Raudhatul Hasanah, S.Psi., Psikolog, CHt.", role: "Psikolog Umum", bio: "Memiliki minat pada permasalahan individu terkait penerimaan diri, persiapan pra-nikah, dinamika dan komunikasi dengan pasangan, serta relasi orang tua dan anak.", expertise: ["Penerimaan diri", "Persiapan pra-nikah", "Dinamika pasangan", "Relasi orang tua dan anak"], education: ["Universitas Negeri Malang — S1 Psikologi (2006)", "Universitas Muhammadiyah Malang — Pendidikan Profesi Psikolog (2026)"], bookable: true },
  { id: "chika", name: "Kurnia Armachika Maylasari, S.Psi., Psikolog", role: "Psikolog Umum", bio: "Ruang yang hangat, aman, dan kolaboratif untuk memahami pengalaman dan menemukan langkah bertumbuh yang sesuai.", expertise: ["Pendampingan orang tua untuk permasalahan anak", "Relasi orang tua dan anak", "Parenting", "Akademik dan karier"], education: ["UIN Sunan Ampel Surabaya — S1 Psikologi (2024)", "Universitas Muhammadiyah Malang — Pendidikan Profesi Psikolog (2026)"], bookable: true },
] as const;

app.get("/psikolog", (c) => c.html(renderPsychologistList([...psychologistProfiles])));
app.get("/psikolog/:id", async (c) => {
  const id = c.req.param("id");
  const profile = psychologistProfiles.find((item) => item.id === id);
  if (!profile) return c.text("Profil psikolog tidak ditemukan.", 404);
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  const offerings = await catalog.listBookableOfferings(id);
  const serviceRows = offerings.map((o) => ({
    mode: o.mode === "online" ? (o.display_name.includes("Chat") ? "Chat" : "Call") : "Tatap Muka",
    priceLabel: `Rp${o.price_idr.toLocaleString("id-ID")}`,
    offeringId: o.id,
  }));
  return c.html(renderPsychologistProfile(profile, { serviceRows }));
});
app.get("/fuja", (c) => c.redirect("/psikolog/fuja"));
app.get("/daris", (c) => c.redirect("/psikolog/daris"));
app.get("/zahra", (c) => c.redirect("/psikolog/zahra"));
app.get("/hasanah", (c) => c.redirect("/psikolog/hasanah"));
app.get("/chika", (c) => c.redirect("/psikolog/chika"));

app.get("/legacy-fuja", (c) =>
  c.html(renderFuja({
    name: "Fuja Rahayu Kinanti, S.Psi., Psikolog",
    bio: "Pendekatan hangat, empatik, dan bebas penghakiman. Berpengalaman lebih dari 50 sesi konseling.",
    expertise: [
      "Kecemasan dan overthinking",
      "Pengembangan diri",
      "Pengelolaan emosi dan stres",
      "Relasi interpersonal",
    ],
    priceOnlineSingle: "Rp125.000",
    priceOfflineSingle: "Rp200.000",
    priceChat: "Rp99.000",
    priceCall: "Rp125.000",
  }))
);

app.get("/faq", (c) => c.html(renderFaq()));

app.get("/safety/crisis", (c) => c.html(renderCrisisNotice()));
app.get("/privacy", (c) => c.html(renderPrivacyNotice()));
app.get("/consent", (c) => c.html(renderConsent()));
app.get("/cancellation", (c) => c.html(renderCancellationPolicy()));

// ---------------------------------------------------------------------------
// Booking flow
// ---------------------------------------------------------------------------

async function resolveOfferingContext(c: { env: Env; req: Request }, offeringId: string) {
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  const offering = await catalog.getPublishedOffering(offeringId);
  if (!offering) return null;
  let psychologistName: string | undefined;
  if (offering.psychologist_id) {
    const psy = await catalog.getPsychologist(offering.psychologist_id);
    if (psy) psychologistName = psy.display_name;
  }
  return { offering, psychologistName };
}

app.get("/book", async (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent("/book")}`);
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent("/book")}`);
  const psid = c.req.query("psychologist");
  const catalog = new CatalogModule(adapter);
  const offerings = await catalog.listBookableOfferings(psid || undefined);
  let psychologistName: string | undefined;
  if (psid) {
    const psy = await catalog.getPsychologist(psid);
    if (psy) psychologistName = psy.display_name;
  }
  const services = offerings.map((offering) => ({
    id: offering.id,
    name: offering.display_name,
    price: `Rp${offering.price_idr.toLocaleString("id-ID")}`,
    mode: offering.mode === "online" ? (offering.display_name.includes("Chat") ? "Online · Chat" : "Online · Call") : "Offline · Tatap muka",
  }));
  return c.html(renderBookingOffer({ services, psychologistName }));
});

app.get("/book/:offeringId/slots", async (c) => {
  const offeringId = c.req.param("offeringId");
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  const offering = await catalog.getPublishedOfferingWithDisplay(offeringId);
  if (!offering) return c.text("Layanan tidak tersedia.", 404);
  const authAdapter = createAdapter({ DB: c.env.DB });
  const clientSession = await new ClientAuthModule(authAdapter).getSession(readCookie(c.req.raw, "seraya_session"));
  const availability = new AvailabilityModule(adapter);
  const slots = await availability.listAvailableSlots({ offeringId, now: new Date() });
  let psychologistName: string | undefined;
  if (offering.psychologist_id) {
    const psy = await catalog.getPsychologist(offering.psychologist_id);
    if (psy) psychologistName = psy.display_name;
  }
  return c.html(renderBookingSlot({
    offeringId,
    slots,
    hasSession: Boolean(clientSession),
    psychologistName,
    serviceName: offering.display_name,
    priceLabel: `Rp${offering.price_idr.toLocaleString("id-ID")}`,
  }));
});

app.post("/book/:offeringId/slots", async (c) => {
  const offeringId = c.req.param("offeringId");
  const body = await c.req.parseBody();
  const slotId = String(body["slotId"] ?? "");
  const returnTo = `/book/${offeringId}/slots`;
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(returnTo)}`);
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent(returnTo)}`);
  if (!slotId) return c.redirect(returnTo);
  const catalog = new CatalogModule(adapter);
  const offering = await catalog.getPublishedOffering(offeringId);
  if (!offering) return c.text("Layanan tidak tersedia.", 404);
  const offerSnapshot = await catalog.createCurrentOfferSnapshot(offeringId, "v1-2026-09-03");
  const availability = new AvailabilityModule(adapter);
  const bookingModule = new BookingModule(adapter, availability);
  let holdResult;
  try {
    holdResult = await bookingModule.createSlotHoldOnly({
      clientId: session.clientId,
      offerSnapshotId: offerSnapshot.id,
      slotId,
      idempotencyKey: crypto.randomUUID(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("capacity overlap")) {
      return c.text("Slot sudah dipesan orang lain. Silakan pilih slot lain.", 409);
    }
    throw e;
  }
  return c.redirect(`/book/${offeringId}/intake?slot=${encodeURIComponent(slotId)}&hold=${encodeURIComponent(holdResult.slotHoldId)}&booking=${encodeURIComponent(holdResult.bookingId)}&expires_at=${encodeURIComponent(holdResult.expiresAt)}`);
});

app.get("/book/:offeringId/intake", async (c) => {
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(c.req.url)}`);
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent(c.req.url)}`);
  const offeringId = c.req.param("offeringId");
  const slotId = c.req.query("slot");
  const holdId = c.req.query("hold");
  if (!slotId) return c.redirect(`/book/${offeringId}/slots`);
  const catalog = new CatalogModule(adapter);
  const offering = await catalog.getPublishedOfferingWithDisplay(offeringId);
  if (!offering) return c.text("Layanan tidak tersedia.", 404);
  let slotLabel: string | undefined;
  if (slotId) {
    const { rows } = await adapter.query<{ starts_at_utc: string; ends_at_utc: string }>({
      sql: `SELECT starts_at_utc, ends_at_utc FROM availability_slot WHERE id = ?`,
      params: [slotId],
    });
    if (rows[0]) {
      const fmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      const endFmt = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false,
      });
      slotLabel = `${fmt.format(new Date(rows[0].starts_at_utc))} – ${endFmt.format(new Date(rows[0].ends_at_utc))} WIB`;
    }
  }
  let psychologistName: string | undefined;
  if (offering.psychologist_id) {
    const psy = await catalog.getPsychologist(offering.psychologist_id);
    if (psy) psychologistName = psy.display_name;
  }
  const expiresIso = c.req.query("expires_at") ?? undefined;
  return c.html(renderBookingIntake({
    offeringId,
    slotId,
    returnTo: `/book/${offeringId}/intake?slot=${encodeURIComponent(slotId)}${holdId ? `&hold=${encodeURIComponent(holdId)}` : ""}${expiresIso ? `&expires_at=${encodeURIComponent(expiresIso)}` : ""}`,
    consentVersion: "v1-2026-08-31",
    psychologistName,
    serviceLabel: offering.display_name,
    slotLabel,
    priceLabel: `Rp${offering.price_idr.toLocaleString("id-ID")}`,
    holdExpiresAt: expiresIso,
  }));
});

app.post("/api/booking/create", async (c) => {
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  const returnTo = safeReturnTo(String(body["returnTo"] ?? "/book"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(returnTo)}`);
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent(returnTo)}`);
  const offeringId = String(body["offeringId"] ?? "").trim();
  if (!offeringId) return c.redirect("/book");
  const catalog = new CatalogModule(adapter);
  const offering = await catalog.getPublishedOffering(offeringId);
  if (!offering) return c.text("Layanan tidak tersedia.", 404);
  const slotId = String(body["slotId"] ?? "");
  if (!slotId) return c.redirect(`/book/${offeringId}/slots`);
  const offerSnapshot = await catalog.createCurrentOfferSnapshot(offeringId, "v1-2026-09-03");
  const availability = new AvailabilityModule(adapter);
  const bookingModule = new BookingModule(adapter, availability);
  let result;
  try {
    result = await bookingModule.createBooking({
      clientId: session.clientId,
      offerSnapshotId: offerSnapshot.id,
      slotId,
      idempotencyKey: String(body["idempotencyKey"] ?? crypto.randomUUID()),
      intake: {
        displayName: String(body["displayName"] ?? ""),
        contactEmail: String(body["contactEmail"] ?? ""),
        contactPhone: normalizeIndonesianPhone(String(body["contactPhone"] ?? "")),
        dateOfBirth: String(body["dateOfBirth"] ?? ""),
        consentVersion: String(body["consentVersion"] ?? "v1-2026-08-31"),
        crisisAck: body["crisisAck"] === "on" || body["crisisAck"] === "true",
        topics: Array.isArray(body["topics"]) ? body["topics"].map(String) : body["topics"] ? [String(body["topics"])] : [],
        problemDescription: String(body["problemDescription"] ?? ""),
        expectedOutcome: String(body["expectedOutcome"] ?? ""),
        returningClient: body["returningClient"] === "yes",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("clinical") || msg.includes("crisis")) {
      return c.redirect(`/safety/crisis?from=booking`);
    }
    throw e;
  }

  const payment = new WhatsAppManualPaymentModule(adapter);
  await payment.generateInvoice(result.bookingId, "text", "preliminary");
  // POST/redirect/GET — refresh-safe confirmation.
  return c.redirect(`/booking/${result.bookingId}/confirmed`);
});

app.get("/booking/:bookingId/confirmed", async (c) => {
  const bookingId = c.req.param("bookingId");
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(c.req.url)}`);
  const { rows: owned } = await adapter.query<{ id: string }>({ sql: `SELECT id FROM booking WHERE id = ? AND client_id = ?`, params: [bookingId, session.clientId] });
  if (!owned[0]) return c.notFound();
  const payment = new WhatsAppManualPaymentModule(adapter);
  const { rows } = await adapter.query<{ expires_at: string; price_idr: number }>({
    sql: `SELECT sh.expires_at, so.price_idr FROM booking b
          JOIN slot_hold sh ON sh.booking_id = b.id
          JOIN service_offering so ON so.id = b.offer_snapshot_id
          WHERE b.id = ? ORDER BY sh.created_at DESC LIMIT 1`,
    params: [bookingId],
  });
  const invoice = await payment.generateInvoice(bookingId, "text", "preliminary");
  const adminWhatsapp = c.env.ADMIN_WHATSAPP_NUMBER ?? "+628****0000";
  return c.html(renderBookingConfirmation({
    bookingId,
    expiresAt: rows[0]?.expires_at ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    whatsappMessage: invoice.textMessage,
    adminWhatsapp,
    pdfDownloadPath: `/api/booking/${bookingId}/invoice.pdf`,
    amountLabel: `Rp${(rows[0]?.price_idr ?? 0).toLocaleString("id-ID")}`,
  }));
});

// Invoice download (PDF) — rendered fresh on demand (ADR 0097).
app.get("/api/booking/:bookingId/invoice.pdf", async (c) => {
  const bookingId = c.req.param("bookingId");
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(c.req.url)}`);
  const { rows: owned } = await adapter.query<{ id: string }>({ sql: `SELECT id FROM booking WHERE id = ? AND client_id = ?`, params: [bookingId, session.clientId] });
  if (!owned[0]) return c.notFound();
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent(c.req.url)}`); 
  const payment = new WhatsAppManualPaymentModule(adapter);
  try {
    const invoice = await payment.generateInvoice(bookingId, "pdf");
    const binary = atob(invoice.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Response(bytes, {
      headers: {
        "content-type": invoice.mimeType,
        "content-disposition": `attachment; filename="${invoice.filename}"`,
      },
    });
  } catch {
    return c.text("Invoice not available", 404);
  }
});

// Plain-text invoice (for clients who just want to copy the message).
app.get("/api/booking/:bookingId/invoice.txt", async (c) => {
  const bookingId = c.req.param("bookingId");
  const adapter = createAdapter({ DB: c.env.DB });
  const session = await new ClientAuthModule(adapter).getSession(readCookie(c.req.raw, "seraya_session"));
  if (!session) return c.redirect(`/auth/login?return_to=${encodeURIComponent(c.req.url)}`);
  const { rows: owned } = await adapter.query<{ id: string }>({ sql: `SELECT id FROM booking WHERE id = ? AND client_id = ?`, params: [bookingId, session.clientId] });
  if (!owned[0]) return c.notFound();
  const client = await new ClientModule(adapter).getProfile(session.clientId);
  if (!client?.profileComplete) return c.redirect(`/client/profile?return_to=${encodeURIComponent(c.req.url)}`); 
  const payment = new WhatsAppManualPaymentModule(adapter);
  try {
    const invoice = await payment.generateInvoice(bookingId, "text");
    return new Response(invoice.textMessage, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch {
    return c.text("Invoice not available", 404);
  }
});

// ---------------------------------------------------------------------------
// Cancellation / refund routes — NOT exposed publicly
// Round 3 resolution: Admin WhatsApp only. We 410 Gone with the
// canonical short-statement copy.
// ---------------------------------------------------------------------------

const whatsappCopy = "Cancellation and refund are handled by Admin via WhatsApp; review is case-by-case.";

app.all("/api/booking/:id/cancel", (c) =>
  c.text(whatsappCopy, 410)
);

app.all("/api/booking/:id/refund", (c) =>
  c.text(whatsappCopy, 410)
);

// ---------------------------------------------------------------------------
// Admin workspace (PLACEHOLDER auth per user instruction)
//
// Production: must replace with Google SSO + StaffMembership + role check
// (ADR 0080/0081). For MVP demo, /admin/* requires the
// `ALLOW_PLACEHOLDER_ADMIN_AUTH=true` env flag (dev only).
// ---------------------------------------------------------------------------

function adminGate(c: { env: Env }): Response | null {
  if (c.env.ALLOW_PLACEHOLDER_ADMIN_AUTH !== "true") {
    return new Response("Admin auth not configured (TBC-STAFF-SESSION-01)", {
      status: 401,
    });
  }
  return null;
}

app.get("/admin", (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  return c.html(
    `<h1>Admin Workspace</h1>
     <ul>
       <li><a href="/admin/bookings">Bookings</a></li>
       <li><a href="/admin/payments">Payment Queue (WhatsApp manual)</a></li>
       <li><a href="/admin/cancellations/new">Record Cancellation Request</a></li>
     </ul>`
  );
});

app.get("/admin/bookings", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  const availability = new AvailabilityModule(adapter);
  const booking = new BookingModule(adapter, availability);
  const payment = new WhatsAppManualPaymentModule(adapter);
  const admin = new AdminWorkspaceModule(adapter, payment);
  const bookings = await admin.listRecentBookings({ limit: 50 });
  const items = bookings
    .map((b) => {
      const bb = b as { id: string; state: string; created_at: string };
      return `<tr><td>${bb.id}</td><td>${bb.state}</td><td>${bb.created_at}</td><td><a href="/admin/bookings/${bb.id}">detail</a></td></tr>`;
    })
    .join("");
  return c.html(`<h1>Bookings</h1><table border=1><tr><th>id</th><th>state</th><th>created_at</th><th></th></tr>${items}</table>`);
});

app.get("/admin/bookings/:id", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const adapter = createAdapter({ DB: c.env.DB });
  const payment = new WhatsAppManualPaymentModule(adapter);
  const admin = new AdminWorkspaceModule(adapter, payment);
  const detail = await admin.getBookingDetail(c.req.param("id"));
  if (!detail) return c.notFound();
  return c.html(renderAdminBookingDetail({ bookingId: c.req.param("id"), detail }));
});

// ----- WhatsApp payment queue (ADR 0097) -----

app.get("/admin/payments", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const adapter = createAdapter({ DB: c.env.DB });
  const payment = new WhatsAppManualPaymentModule(adapter);
  const admin = new AdminWorkspaceModule(adapter, payment);
  const pending = await admin.listPendingPayments();
  // Narrow PaymentProof to the columns the queue view renders.
  const queueRows = pending.map((row) => ({
    id: row.id,
    booking_id: row.bookingId,
    client_name: row.client_name,
    payment_method: row.paymentMethod,
    evidence_url: row.evidenceUrl,
    recorded_at: row.recordedAt,
    status: row.status,
  }));
  return c.html(renderAdminPaymentQueue({ pending: queueRows }));
});

app.get("/admin/payments/:proofId/verify", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const proofId = c.req.param("proofId");
  const adapter = createAdapter({ DB: c.env.DB });
  const { rows } = await adapter.query<{
    id: string;
    booking_id: string;
    payment_method: string;
    evidence_url: string | null;
    evidence_note: string | null;
    recorded_at: string;
    status: string;
  }>({
    sql: `SELECT id, booking_id, payment_method, evidence_url, evidence_note,
                 recorded_at, status
          FROM payment_proof WHERE id = ?`,
    params: [proofId],
  });
  const proof = rows[0];
  if (!proof) return c.notFound();
  return c.html(renderAdminPaymentVerify({ proof }));
});

app.get("/admin/payments/:proofId/record", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  return c.html(renderAdminPaymentRecord({ bookingId: c.req.query("bookingId") ?? "" }));
});

// POST: Admin records a new payment_proof for a booking.
app.post("/api/payment/manual/record", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const payment = new WhatsAppManualPaymentModule(adapter);
  try {
    const result = await payment.recordPayment({
      bookingId: String(body["bookingId"] ?? ""),
      paymentMethod: String(body["paymentMethod"] ?? "bank_transfer") as
        | "qris"
        | "bank_transfer"
        | "cash",
      evidenceUrl: body["evidenceUrl"] ? String(body["evidenceUrl"]) : null,
      evidenceNote: body["evidenceNote"] ? String(body["evidenceNote"]) : null,
      adminMembershipId: "PLACEHOLDER_ADMIN",
    });
    return c.text(
      `Payment proof ${result.paymentProofId} ${result.created ? "recorded" : "already exists"}.`
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.text(`Failed to record payment: ${msg}`, 400);
  }
});

// POST: Admin verifies or rejects a payment_proof.
app.post("/api/payment/manual/verify", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const payment = new WhatsAppManualPaymentModule(adapter);
  const admin = new AdminWorkspaceModule(adapter, payment);
  const proofId = String(body["paymentProofId"] ?? "");
  const status = String(body["status"] ?? "verified") as "verified" | "rejected";
  const reason = body["reason"] ? String(body["reason"]) : null;
  try {
    if (status === "verified") {
      const result = await admin.markAsPaid(String(body["bookingId"] ?? ""), proofId);
      return c.text(
        `Payment verified. Booking state: ${result.bookingState}. Proof: ${result.paymentProof.id}.`
      );
    } else {
      const result = await admin.rejectPayment(proofId, reason ?? "no reason given");
      return c.text(
        `Payment rejected. Booking state: ${result.bookingState}. Proof: ${result.paymentProof.id}.`
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.text(`Failed to verify payment: ${msg}`, 400);
  }
});

app.get("/admin/refunds/new", (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  return c.html(`<h1>Record Manual Refund</h1>
    <form method=POST action=/admin/refunds>
      <label>Booking ID <input name=bookingId required></label><br>
      <label>Amount IDR <input name=amountIdr type=number min=0 required></label><br>
      <label>Reason <input name=reasonCategory required></label><br>
      <label>Note <textarea name=note></textarea></label><br>
      <button type=submit>Record Refund</button>
    </form>`);
});

app.post("/admin/refunds", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const admin = new AdminWorkspaceModule(adapter, new WhatsAppManualPaymentModule(adapter));
  try {
    const result = await admin.recordRefund({ bookingId: String(body["bookingId"] ?? ""), amountIdr: Number(body["amountIdr"] ?? 0), reasonCategory: String(body["reasonCategory"] ?? ""), note: body["note"] ? String(body["note"]) : null, actorMembershipId: "PLACEHOLDER_ADMIN" });
    return c.text(`Refund ${result.refundId} recorded as pending.`);
  } catch (error) {
    return c.text(error instanceof Error ? error.message : "Failed to record refund", 400);
  }
});

app.get("/admin/cancellations/new", (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  return c.html(`<h1>Record Cancellation Request</h1>
    <form method=POST action=/admin/cancellations>
      <label>Target Kind <select name=target_kind>
        <option>booking</option><option>appointment</option><option>package_purchase</option>
      </select></label><br>
      <label>Target ID <input name=target_id></label><br>
      <label>Client ID <input name=client_id></label><br>
      <label>Intake Channel <input name=intake_channel value=admin_whatsapp></label><br>
      <label>Summary <textarea name=intake_summary></textarea></label><br>
      <button type=submit>Record</button>
    </form>`);
});

app.post("/admin/cancellations", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const payment = new WhatsAppManualPaymentModule(adapter);
  const admin = new AdminWorkspaceModule(adapter, payment);
  const id = await admin.recordCancellationRequest({
    targetKind: String(body["target_kind"] ?? "booking") as "booking" | "appointment" | "package_purchase",
    targetId: String(body["target_id"] ?? ""),
    clientId: String(body["client_id"] ?? ""),
    intakeChannel: String(body["intake_channel"] ?? "admin_whatsapp") as "client_whatsapp" | "admin_whatsapp" | "psychologist_unavailable",
    intakeSummary: body["intake_summary"] ? String(body["intake_summary"]) : null,
  });
  return c.text(`Cancellation request ${id.cancellationRequestId} recorded.`);
});

app.post("/admin/evidence", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const admin = new AdminWorkspaceModule(adapter, new WhatsAppManualPaymentModule(adapter));
  try {
    const result = await admin.recordEvidence({
      bookingId: String(body["bookingId"] ?? ""),
      evidenceKind: String(body["evidenceKind"] ?? "cancellation_whatsapp") as "cancellation_whatsapp" | "refund_transfer",
      storageReference: String(body["storageReference"] ?? ""),
      note: body["note"] ? String(body["note"]) : null,
      actorMembershipId: "PLACEHOLDER_ADMIN",
    });
    return c.text(`Evidence ${result.evidenceId} recorded.`);
  } catch (error) {
    return c.text(error instanceof Error ? error.message : "Failed to record evidence", 400);
  }
});

// ---------------------------------------------------------------------------
// Error handlers
// ---------------------------------------------------------------------------

app.notFound((c) =>
  c.html("<h1>404</h1><p>Halaman tidak ditemukan. <a href='/'>Kembali</a>.</p>", 404)
);

app.onError((err, c) => {
  console.error(err);
  const message = err instanceof Error ? err.message : String(err);
  // Defensive: do not leak the raw error message to clients. Provide a
  // safe fallback and never mention clinical content in the response.
  return c.html(
    `<h1>500</h1>
     <p>Terjadi kesalahan pada sistem. Silakan coba kembali atau <a href="/safety/crisis">lihat bantuan darurat</a> jika kondisi krisis.</p>`,
    500,
  );
});

export default app;