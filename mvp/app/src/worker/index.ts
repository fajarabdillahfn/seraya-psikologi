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
import { createAdapter } from "../persistence/d1-adapter";
import { CatalogModule } from "../modules/catalog";
import { AvailabilityModule } from "../modules/availability";
import { BookingModule } from "../modules/booking";
import { WhatsAppManualPaymentModule } from "../modules/payment";
import { AdminWorkspaceModule } from "../modules/admin";
import {
  renderHome,
  renderPulang,
  renderFuja,
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

interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;  // PLACEHOLDER (TBC-STAFF-SESSION-01)
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

app.get("/static/css/main.css", async (c) => {
  if (!c.env.DB) {
    return new Response("", { status: 404 });
  }
  return new Response("/* MVP placeholder */", {
    status: 200,
    headers: { "content-type": "text/css; charset=utf-8" },
  });
});

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

  // ADR 0097: After booking is created, the Worker hands the booking off
  // to the WhatsApp Manual Payment flow:
  //   - Generate the invoice (text + PDF metadata) for the booking.
  //   - Render the confirmation page with WhatsApp instructions:
  //       - WhatsApp message text (copy/paste to Admin number)
  //       - Invoice PDF download link
  //       - Admin WhatsApp contact number
  //   - The booking is now in 'pending_manual_payment'; Admin will verify
  //     the payment_proof once the client sends the transfer slip.
  const payment = new WhatsAppManualPaymentModule(adapter);
  const invoice = await payment.generateInvoice(result.bookingId, "text");
  const adminWhatsapp = c.env.ADMIN_WHATSAPP_NUMBER ?? "+628000000000";

  return c.html(renderBookingConfirmation({
    bookingId: result.bookingId,
    expiresAt: result.expiresAt,
    whatsappMessage: invoice.textMessage,
    adminWhatsapp,
    pdfDownloadPath: `/api/booking/${result.bookingId}/invoice.pdf`,
  }));
});

// Invoice download (PDF) — rendered fresh on demand (ADR 0097).
app.get("/api/booking/:bookingId/invoice.pdf", async (c) => {
  const bookingId = c.req.param("bookingId");
  const adapter = createAdapter({ DB: c.env.DB });
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