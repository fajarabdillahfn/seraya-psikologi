/**
 * PaymentModule — WhatsApp Manual Payment flow (ADR 0097).
 *
 * Replaces the Midtrans-driven settlement pipeline with a manual workflow:
 *   1. After booking intake, the booking is created with state
 *      'pending_manual_payment' (no provider-side redirect).
 *   2. Worker generates a WhatsApp invoice in two formats:
 *        - 'pdf':  minimal PDF byte-string (no external dependency)
 *        - 'text': preformatted WhatsApp message with bank/QRIS instructions
 *   3. Client sends payment screenshot/transfer slip to Admin via WhatsApp.
 *   4. Admin records proof via `recordPayment(...)` and the Worker creates
 *      a `payment_proof` row with status='submitted'.
 *   5. Admin reviews via `verifyPayment(...)`; either:
 *        - 'verified' → payment_proof.status='verified' AND booking.state='confirmed'
 *        - 'rejected' → payment_proof.status='rejected' AND booking.state='cancelled'
 *
 * Idempotency:
 *   - UNIQUE(booking_id) on payment_proof enforces at-most-one proof per booking.
 *   - `verifyPayment` is idempotent: re-applying with the same terminal status
 *     is a no-op and returns the existing proof row.
 *
 * Atomic transitions:
 *   - `verifyPayment` performs the payment_proof.status update AND
 *     booking.state update in one db.batch call.
 *   - State guards: only proofs in status='submitted' may transition.
 *
 * NOTE: All amounts are integer IDR (minor unit). The invoice generators
 * intentionally produce self-contained output with no external network calls —
 * the PDF is a hand-rolled minimal PDF (no pdfkit/pdf-lib dependency).
 */

import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import type { Booking, PaymentMethod, PaymentProof } from "../domain/types";

// ---------------------------------------------------------------------------
// Invoice generation (PDF + text) — ADR 0097
// ---------------------------------------------------------------------------

const WIB = "Asia/Jakarta";
const wibExpiry = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: WIB,
});

// Expiry is stored as UTC ISO; invoices present it in the client's local
// timezone (Asia/Jakarta) like every other user-facing timestamp.
function formatWibExpiry(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${wibExpiry.format(d)} WIB`;
}

export interface InvoiceInput {
  bookingId: string;
  clientDisplayName: string;
  clientContactEmail: string;
  offeringName: string;
  amountIdr: number;
  expiresAt: string;
  adminWhatsappNumber: string; // e.g. "+6281234567890"
  bankInstructions: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImageUrl?: string;
  };
}

export interface InvoiceOutput {
  filename: string;
  mimeType: string;
  contentBase64: string;
  textMessage: string;
}

/**
 * Hand-rolled minimal PDF generator. Produces a valid PDF 1.4 document with
 * a single A4 page containing invoice text. Intentionally tiny — no fonts,
 * no images, just Helvetica core. ~1.5KB output for typical invoices.
 */
function buildPdfInvoice(input: InvoiceInput): string {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const fmtRupiah = (n: number) =>
    "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

  const lines: { y: number; size: number; text: string }[] = [];
  let y = 800;
  const lineH = 18;

  const addLine = (text: string, size = 11, bold = false) => {
    lines.push({ y, size, text: bold ? `**${text}**` : text });
    y -= lineH;
  };

  addLine("SERAYA PSIKOLOGI", 18, true);
  addLine("Invoice Pembayaran", 12);
  y -= 6;
  addLine(`Invoice ID: ${input.bookingId}`, 10);
  addLine(`Tanggal: ${new Date().toISOString().slice(0, 10)}`, 10);
  y -= 12;
  addLine("Detail Klien", 12, true);
  addLine(`Nama: ${input.clientDisplayName}`);
  addLine(`Email: ${input.clientContactEmail}`);
  y -= 12;
  addLine("Detail Layanan", 12, true);
  addLine(`Layanan: ${input.offeringName}`);
  addLine(`Total: ${fmtRupiah(input.amountIdr)}`, 12, true);
  y -= 12;
  addLine("Instruksi Pembayaran", 12, true);
  addLine(`Bank: ${input.bankInstructions.bankName}`);
  addLine(`No. Rekening: ${input.bankInstructions.accountNumber}`);
  addLine(`Atas Nama: ${input.bankInstructions.accountHolder}`);
  if (input.bankInstructions.qrisImageUrl) {
    addLine(`QRIS: ${input.bankInstructions.qrisImageUrl}`);
  }
  y -= 12;
  addLine("Batas Pembayaran", 12, true);
  addLine(input.expiresAt);
  y -= 18;
  addLine("Setelah membayar, kirim bukti transfer via WhatsApp:", 10);
  addLine(`Admin Seraya: ${input.adminWhatsappNumber}`, 10, true);

  // Build PDF content stream
  const stream = lines
    .map((l) => {
      // We render bold markers as duplicate text — for simplicity we render
      // the raw text only (no bold distinction at this fidelity).
      return `BT /F1 ${l.size} Tf 50 ${l.y} Td (${escape(l.text)}) Tj ET`;
    })
    .join("\n");

  const objects: string[] = [];
  // 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  // 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  // 3: Page
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
  );
  // 4: Content stream
  objects.push(
    `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  );
  // 5: Font
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
  );

  // Build the full PDF
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

function buildTextInvoice(input: InvoiceInput): string {
  const fmtRupiah = (n: number) =>
    "Rp " + n.toLocaleString("id-ID", { maximumFractionDigits: 0 });

  return [
    `Halo ${input.clientDisplayName}, terima kasih sudah booking di Seraya Psikologi. 🌿`,
    ``,
    `*Detail Booking*`,
    `ID Booking: ${input.bookingId}`,
    `Layanan: ${input.offeringName}`,
    `Total: ${fmtRupiah(input.amountIdr)}`,
    ``,
    `*Cara Pembayaran*`,
    `Bank: ${input.bankInstructions.bankName}`,
    `No. Rekening: ${input.bankInstructions.accountNumber}`,
    `Atas Nama: ${input.bankInstructions.accountHolder}`,
    input.bankInstructions.qrisImageUrl
      ? `QRIS: ${input.bankInstructions.qrisImageUrl}`
      : null,
    ``,
    `*Batas Pembayaran*`,
    `${input.expiresAt}`,
    ``,
    `Setelah membayar, mohon kirim bukti transfer (screenshot/foto) ke WhatsApp Admin Seraya di nomor ${input.adminWhatsappNumber} agar booking kamu segera dikonfirmasi.`,
    ``,
    `Cancellation dan refund ditangani Admin — review case-by-case.`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export interface WhatsAppPaymentConfig {
  adminWhatsappNumber: string;
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  qrisImageUrl: string | null;
}

const DEFAULT_CONFIG: WhatsAppPaymentConfig = {
  adminWhatsappNumber: "+628000000000",
  bankName: "BCA",
  bankAccount: "0000000000",
  bankHolder: "Yayasan Seraya",
  qrisImageUrl: null,
};

// ---------------------------------------------------------------------------
// WhatsAppManualPaymentModule
// ---------------------------------------------------------------------------

export class WhatsAppManualPaymentModule {
  constructor(
    private readonly db: PersistenceAdapter,
    private readonly config: WhatsAppPaymentConfig = DEFAULT_CONFIG
  ) {}

  /**
   * Generate a WhatsApp-ready invoice (PDF + text) for the given booking.
   *
   * Pure function — no DB writes. The caller (Worker route) embeds the
   * resulting text in `renderBookingConfirmation` and writes the PDF to
   * R2/KV (out of scope for this MVP; the PDF is returned base64 for the
   * browser to download directly).
   */
  async generateInvoice(
    bookingId: string,
    format: "pdf" | "text",
    kind: "official" | "preliminary" = "official"
  ): Promise<InvoiceOutput> {
    const { rows } = await this.db.query<{
      booking_id: string;
      client_display_name: string;
      client_contact_email: string;
      offering_name: string;
      amount_idr: number;
      expires_at: string;
    }>({
      sql: `SELECT b.id AS booking_id,
                   c.display_name AS client_display_name,
                   c.contact_email AS client_contact_email,
                   s.display_name AS offering_name,
                   os.price_idr AS amount_idr,
                   sh.expires_at AS expires_at
            FROM booking b
            JOIN client c ON c.id = b.client_id
            JOIN offer_snapshot os ON os.id = b.offer_snapshot_id
            JOIN service_offering so ON so.id = os.offering_id
            JOIN service s ON s.id = so.service_id
            LEFT JOIN slot_hold sh ON sh.booking_id = b.id
            WHERE b.id = ?`,
      params: [bookingId],
    });
    const row = rows[0];
    if (!row) throw new Error(`booking ${bookingId} not found`);
    if (kind === "official") {
      const { rows: verified } = await this.db.query<{ id: string }>({
        sql: `SELECT id FROM payment_proof WHERE booking_id = ? AND status = 'verified' LIMIT 1`,
        params: [bookingId],
      });
      if (!verified[0]) throw new Error(`official invoice unavailable until payment verification`);
    }

    const invoiceInput: InvoiceInput = {
      bookingId: row.booking_id,
      clientDisplayName: row.client_display_name,
      clientContactEmail: row.client_contact_email,
      offeringName: row.offering_name,
      amountIdr: row.amount_idr,
      expiresAt: row.expires_at
        ? formatWibExpiry(row.expires_at)
        : new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      adminWhatsappNumber: this.config.adminWhatsappNumber,
      bankInstructions: {
        bankName: this.config.bankName,
        accountNumber: this.config.bankAccount,
        accountHolder: this.config.bankHolder,
        qrisImageUrl: this.config.qrisImageUrl ?? undefined,
      },
    };

    if (format === "pdf") {
      const pdfBytes = buildPdfInvoice(invoiceInput);
      const uint8 = new TextEncoder().encode(pdfBytes);
      // Chunked base64 encode — chunk to avoid spread-of-large-uint8array
      // (TS targets without `--downlevelIteration` reject it).
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        const slice = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
        binary += String.fromCharCode.apply(null, Array.from(slice));
      }
      const base64 = btoa(binary);
      return {
        filename: `seraya-invoice-${bookingId}.pdf`,
        mimeType: "application/pdf",
        contentBase64: base64,
        textMessage: buildTextInvoice(invoiceInput),
      };
    }
    const text = buildTextInvoice(invoiceInput);
    return {
      filename: `seraya-invoice-${bookingId}.txt`,
      mimeType: "text/plain; charset=utf-8",
      contentBase64: btoa(unescape(encodeURIComponent(text))),
      textMessage: text,
    };
  }

  /**
   * Record a payment proof submitted by Admin after the client sends a
   * WhatsApp screenshot/transfer slip.
   *
   * Inserts a new `payment_proof` row with status='submitted'. UNIQUE
   * (booking_id) guarantees at-most-one proof per booking; if a proof
   * already exists in 'submitted' state, the call returns the existing row
   * (idempotent).
   */
  async recordPayment(args: {
    bookingId: string;
    paymentMethod: PaymentMethod;
    evidenceUrl?: string | null;
    evidenceNote?: string | null;
    adminMembershipId: string;
  }): Promise<{ paymentProofId: string; created: boolean }> {
    const { rows: existing } = await this.db.query<{ id: string; status: string }>({
      sql: `SELECT id, status FROM payment_proof WHERE booking_id = ?`,
      params: [args.bookingId],
    });
    if (existing[0]) {
      // Idempotent: surface the existing proof regardless of status.
      return { paymentProofId: existing[0].id, created: false };
    }
    const proofId = randomUUID();
    const recordedAt = new Date().toISOString();
    await this.db.batch([
      {
        sql: `INSERT INTO payment_proof
              (id, booking_id, payment_method, evidence_url, evidence_note,
               status, recorded_by_membership_id, recorded_at)
              VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)`,
        params: [
          proofId,
          args.bookingId,
          args.paymentMethod,
          args.evidenceUrl ?? null,
          args.evidenceNote ?? null,
          args.adminMembershipId,
          recordedAt,
        ],
      },
    ]);
    return { paymentProofId: proofId, created: true };
  }

  /**
   * Verify (accept) or reject a recorded payment proof.
   *
   * Atomic transition (single db.batch):
   *   - payment_proof.status → 'verified' or 'rejected'
   *   - booking.state        → 'confirmed' (verified) or 'cancelled' (rejected)
   *
   * Idempotent: re-applying with the same terminal status is a no-op that
   * returns the existing proof row.
   */
  async verifyPayment(args: {
    paymentProofId: string;
    adminMembershipId: string;
    status: "verified" | "rejected";
    rejectionReason?: string | null;
  }): Promise<{ paymentProof: PaymentProof; bookingState: Booking["state"] }> {
    const { rows } = await this.db.query<PaymentProof & { booking_state: string }>({
      sql: `SELECT pp.*, b.state AS booking_state
            FROM payment_proof pp
            JOIN booking b ON b.id = pp.booking_id
            WHERE pp.id = ?`,
      params: [args.paymentProofId],
    });
    const row = rows[0];
    if (!row) throw new Error(`payment_proof ${args.paymentProofId} not found`);

    // Idempotency: terminal status reached — return as-is.
    if (row.status === args.status) {
      const { booking_state: _ignored, ...proof } = row;
      return { paymentProof: proof, bookingState: row.booking_state as Booking["state"] };
    }

    // State guard: a 'verified'/'rejected' proof may not flip back.
    if (row.status !== "submitted") {
      throw new Error(
        `payment_proof ${args.paymentProofId} is in terminal status '${row.status}'; cannot transition to '${args.status}'`
      );
    }

    const verifiedAt = new Date().toISOString();
    const nextBookingState: Booking["state"] =
      args.status === "verified" ? "confirmed" : "cancelled";

    await this.db.batch([
      {
        sql: `UPDATE payment_proof
              SET status = ?, verified_by_membership_id = ?, verified_at = ?,
                  rejection_reason = ?
              WHERE id = ? AND status = 'submitted'`,
        params: [
          args.status,
          args.adminMembershipId,
          verifiedAt,
          args.status === "rejected" ? args.rejectionReason ?? null : null,
          args.paymentProofId,
        ],
      },
      {
        sql: `UPDATE booking
              SET state = ?, updated_at = ?
              WHERE id = ? AND state IN ('pending_manual_payment','awaiting_confirmation')`,
        params: [nextBookingState, verifiedAt, row.bookingId],
      },
    ]);

    const updated: PaymentProof = {
      id: row.id,
      bookingId: row.bookingId,
      paymentMethod: row.paymentMethod,
      evidenceUrl: row.evidenceUrl,
      evidenceNote: row.evidenceNote,
      status: args.status,
      recordedByMembershipId: row.recordedByMembershipId,
      recordedAt: row.recordedAt,
      verifiedByMembershipId: args.adminMembershipId,
      verifiedAt,
      rejectionReason:
        args.status === "rejected" ? args.rejectionReason ?? null : null,
    };
    return { paymentProof: updated, bookingState: nextBookingState };
  }

  /**
   * Read-only: list payment proofs awaiting Admin review.
   * Used by Admin dashboard.
   */
  async listPendingPayments(): Promise<
    Array<PaymentProof & { booking_state: Booking["state"]; client_name: string }>
  > {
    const { rows } = await this.db.query<
      PaymentProof & { booking_state: Booking["state"]; client_name: string }
    >({
      sql: `SELECT pp.*, b.state AS booking_state, c.display_name AS client_name
            FROM payment_proof pp
            JOIN booking b ON b.id = pp.booking_id
            JOIN client c ON c.id = b.client_id
            WHERE pp.status = 'submitted'
            ORDER BY pp.recorded_at ASC`,
    });
    return rows;
  }
}

/**
 * Backwards-compatible alias. The Worker entrypoint and admin module
 * instantiate `PaymentModule`; for the WhatsApp manual flow this is the
 * same object as `WhatsAppManualPaymentModule`.
 *
 * The legacy class name is retained to avoid churn in modules that import
 * it (admin.ts). It exposes no Midtrans/PaymentGatewayAdapter surface —
 * that surface has been removed entirely per ADR 0097.
 */
export const PaymentModule = WhatsAppManualPaymentModule;
export type PaymentModule = WhatsAppManualPaymentModule;