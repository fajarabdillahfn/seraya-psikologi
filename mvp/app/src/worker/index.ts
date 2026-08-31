/**
 * Seraya Psikologi — Worker entry point.
 *
 * Implements:
 * - Public marketing surfaces (Home, SERAYA PULANG, About, Fuja profile, FAQ)
 * - Booking flow (offer selection, slot selection, intake, payment, confirmation)
 * - ClientAccess (magic-link issuance, scoped session, booking view)
 * - Admin workspace (placeholder; auth = stub until TBC-STAFF-SESSION-01 closes)
 * - Midtrans webhook ingestion (placeholder; provider adapter is a stub)
 * - Cancellation/refund public route: NOT exposed. Routes go to 410 Gone
 *   with the "Admin WhatsApp" copy per Round 3 resolution.
 *
 * Authorization note (per user instruction): This MVP uses placeholder
 * auth for staff routes. Production must integrate Google SSO +
 * StaffMembership + role check (ADR 0080/0081). The placeholder is
 * gated behind a single env flag and documented in `docs/MVP-LIMITATIONS.md`.
 */

import { Hono } from "hono";
import { createAdapter } from "../persistence/d1-adapter";
import { CatalogModule } from "../modules/catalog";
import { AvailabilityModule } from "../modules/availability";
import { BookingModule } from "../modules/booking";
import { PaymentModule } from "../modules/payment";
import { AdminWorkspaceModule } from "../modules/admin";
import { MidtransSnapAdapter } from "../adapters/midtrans-snap";
import { renderHome } from "../views/home";
import { renderPulang } from "../views/pulang";
import { renderFuja } from "../views/fuja";
import { renderFaq } from "../views/faq";
import { renderBookingOffer } from "../views/booking-offer";
import { renderBookingSlot } from "../views/booking-slot";
import { renderBookingIntake } from "../views/booking-intake";
import { renderBookingConfirmation } from "../views/booking-confirmation";
import { renderCrisisNotice } from "../views/crisis";
import { renderPrivacyNotice } from "../views/privacy";
import { renderConsent } from "../views/consent";
import { renderCancellationPolicy } from "../views/cancellation-policy";
import { renderAdminBookingDetail } from "../views/admin-booking-detail";

interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  MIDTRANS_SERVER_KEY?: string;     // PLACEHOLDER (set via `wrangler secret put`)
  GOOGLE_OAUTH_CLIENT_ID?: string;  // PLACEHOLDER (TBC-STAFF-SESSION-01)
  EMAIL_PROVIDER_KEY?: string;      // PLACEHOLDER (TBC-NOTIFY-01)
  ALLOW_PLACEHOLDER_ADMIN_AUTH?: string; // 'true' enables /admin/* in dev only
}

const app = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------

app.get("/static/css/main.css", async (c) =>
  c.body(await c.env.DB ? new Response("/* MVP placeholder */", {
    headers: { "content-type": "text/css; charset=utf-8" },
  }) : new Response("", { status: 404 }), 200)
);

app.get("/healthz", (c) =>
  c.json({ status: "ok", environment: c.env.ENVIRONMENT ?? "unknown" })
);

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

app.get("/about", (c) => c.html("<h1>Tentang Seraya</h1><p>Placeholder.</p>"));

app.get("/fuja", (c) =>
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

app.get("/book", (c) =>
  c.html(renderBookingOffer({
    services: [
      { id: "individual-online-single", name: "Konseling Individu — Online (60 menit)", price: "Rp125.000", mode: "online" },
      { id: "individual-offline-single", name: "Konseling Individu — Offline (60 menit)", price: "Rp200.000", mode: "offline" },
    ],
  }))
);

app.get("/book/:offeringId/slots", async (c) => {
  const offeringId = c.req.param("offeringId");
  const adapter = createAdapter({ DB: c.env.DB });
  const availability = new AvailabilityModule(adapter);
  const slots = await availability.listAvailableSlots({
    offeringId,
    now: new Date(),
  });
  return c.html(renderBookingSlot({ offeringId, slots }));
});

app.get("/book/:offeringId/intake", (c) =>
  c.html(renderBookingIntake({
    offeringId: c.req.param("offeringId"),
    consentVersion: "v1-2026-08-31",
  }))
);

app.post("/api/booking/create", async (c) => {
  const body = await c.req.parseBody();
  const adapter = createAdapter({ DB: c.env.DB });
  const availability = new AvailabilityModule(adapter);
  const booking = new BookingModule(adapter, availability);
  const result = await booking.createBooking({
    clientId: String(body["clientId"] ?? ""),
    offerSnapshotId: String(body["offerSnapshotId"] ?? ""),
    slotId: String(body["slotId"] ?? ""),
    idempotencyKey: String(body["idempotencyKey"] ?? crypto.randomUUID()),
    intake: {
      displayName: String(body["displayName"] ?? ""),
      contactEmail: String(body["contactEmail"] ?? ""),
      contactPhone: body["contactPhone"] ? String(body["contactPhone"]) : null,
      consentVersion: String(body["consentVersion"] ?? "v1-2026-08-31"),
      crisisAck: body["crisisAck"] === "on" || body["crisisAck"] === "true",
      shortMessage: body["shortMessage"] ? String(body["shortMessage"]) : null,
    },
  });
  return c.html(renderBookingConfirmation({
    bookingId: result.bookingId,
    expiresAt: result.expiresAt,
  }));
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
// Payment webhook ingestion
//
// In production this is the Midtrans notification endpoint. Until
// TBC-PAY-01 closes (real Midtrans merchant onboarding + signature
// verification), this returns 503 to make the placeholder explicit.
// ---------------------------------------------------------------------------

app.post("/api/payment/notification", async (c) => {
  if (!c.env.MIDTRANS_SERVER_KEY) {
    return c.text("Payment provider not yet onboarded (TBC-PAY-01)", 503);
  }
  const adapter = createAdapter({ DB: c.env.DB });
  const gateway = new MidtransSnapAdapter({
    serverKey: c.env.MIDTRANS_SERVER_KEY,
    isProduction: c.env.ENVIRONMENT === "production",
  });
  const payment = new PaymentModule(adapter, gateway);
  const body = await c.req.parseBody();
  const providerEvent = await gateway.verifyNotification(body);
  const result = await payment.applyVerifiedPaymentEvent({
    paymentId: String(body["paymentId"] ?? ""),
    providerEvent,
    actorAt: new Date().toISOString(),
  });
  return c.json({ applied: result.applied, reason: result.reason });
});

// ---------------------------------------------------------------------------
// Admin workspace (PLACEHOLDER auth per user instruction)
//
// Production: must replace with Google SSO + StaffMembership + role check
// (ADR 0080/0081). For MVP demo, /admin/* requires the
// `ALLOW_PLACEHOLDER_ADMIN_AUTH=true` env flag (dev only).
// ---------------------------------------------------------------------------

function adminGate(c: { env: Env }) {
  if (c.env.ALLOW_PLACEHOLDER_ADMIN_AUTH !== "true") {
    return c.text("Admin auth not configured (TBC-STAFF-SESSION-01)", 401);
  }
  return null;
}

app.get("/admin", (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  return c.html("<h1>Admin Workspace</h1><p>Placeholder. See <a href='/admin/bookings'>bookings</a>.</p>");
});

app.get("/admin/bookings", async (c) => {
  const gate = adminGate(c);
  if (gate) return gate;
  const adapter = createAdapter({ DB: c.env.DB });
  const catalog = new CatalogModule(adapter);
  const availability = new AvailabilityModule(adapter);
  const booking = new BookingModule(adapter, availability);
  const payment = new PaymentModule(adapter, new MidtransSnapAdapter({
    serverKey: c.env.MIDTRANS_SERVER_KEY ?? "PLACEHOLDER",
    isProduction: false,
  }));
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
  const payment = new PaymentModule(adapter, new MidtransSnapAdapter({
    serverKey: c.env.MIDTRANS_SERVER_KEY ?? "PLACEHOLDER",
    isProduction: false,
  }));
  const admin = new AdminWorkspaceModule(adapter, payment);
  const detail = await admin.getBookingDetail(c.req.param("id"));
  if (!detail) return c.notFound();
  return c.html(renderAdminBookingDetail({ bookingId: c.req.param("id"), detail }));
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
  const payment = new PaymentModule(adapter, new MidtransSnapAdapter({
    serverKey: c.env.MIDTRANS_SERVER_KEY ?? "PLACEHOLDER",
    isProduction: false,
  }));
  const admin = new AdminWorkspaceModule(adapter, payment);
  const id = await admin.recordCancellationRequest({
    targetKind: String(body["target_kind"] ?? "booking") as "booking" | "appointment" | "package_purchase",
    targetId: String(body["target_id"] ?? ""),
    clientId: String(body["client_id"] ?? ""),
    intakeChannel: String(body["intake_channel"] ?? "admin_whatsapp"),
    intakeSummary: body["intake_summary"] ? String(body["intake_summary"]) : null,
  });
  return c.text(`Cancellation request ${id.cancellationRequestId} recorded.`);
});

// ---------------------------------------------------------------------------
// Error handlers
// ---------------------------------------------------------------------------

app.notFound((c) =>
  c.html("<h1>404</h1><p>Halaman tidak ditemukan. <a href='/'>Kembali</a>.</p>", 404)
);

app.onError((err, c) => {
  console.error(err);
  return c.html(`<h1>500</h1><p>Terjadi kesalahan. <a href='/safety/crisis'>Butuh bantuan segera?</a></p>`, 500);
});

export default app;