import { randomUUID } from "node:crypto";
import type { PersistenceAdapter } from "../persistence/adapter";
import { DomainError, IntakeErrors } from "../domain/types";
import { normalizeIndonesianPhone } from "./booking";

export interface ClientProfileInput {
  namaPanggilan: string;
  dateOfBirth: string;
  jenisKelamin: string;
  pekerjaan: string;
  pendidikan: string;
  contactPhone: string;
  statusPernikahan: string;
  agama: string;
  negara: string;
  provinsi: string;
  kotaKabupaten: string;
  alamatLengkap: string;
}

export interface ClientProfile extends ClientProfileInput {
  id: string;
  googleSubject: string;
  email: string;
  profileComplete: boolean;
}

const requiredText = (value: string, field: string, min = 1, max = 120) => {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new DomainError("E-PROFILE-INVALID", `${field} invalid`);
  }
  return normalized;
};

function ageAt(dateOfBirth: string, now: Date): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) throw new DomainError(IntakeErrors.OutOfScope, "date_of_birth invalid");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dob = new Date(Date.UTC(year, month - 1, day));
  if (dob.getUTCFullYear() !== year || dob.getUTCMonth() !== month - 1 || dob.getUTCDate() !== day) {
    throw new DomainError(IntakeErrors.OutOfScope, "date_of_birth invalid");
  }
  const jakarta = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  let age = jakarta.getUTCFullYear() - year;
  if (jakarta.getUTCMonth() + 1 < month || (jakarta.getUTCMonth() + 1 === month && jakarta.getUTCDate() < day)) age--;
  return age;
}

export function validateClientProfile(input: ClientProfileInput, now = new Date()): ClientProfileInput {
  const phone = normalizeIndonesianPhone(input.contactPhone);
  if (!/^\+628[1-9][0-9]{6,11}$/.test(phone)) throw new DomainError(IntakeErrors.InvalidPhone, "contact_phone invalid");
  if (ageAt(input.dateOfBirth, now) < 18) throw new DomainError(IntakeErrors.OutOfScope, "client must be 18 or older");
  return {
    namaPanggilan: requiredText(input.namaPanggilan, "nama_panggilan", 2, 50),
    dateOfBirth: input.dateOfBirth,
    jenisKelamin: requiredText(input.jenisKelamin, "jenis_kelamin"),
    pekerjaan: requiredText(input.pekerjaan, "pekerjaan", 2, 100),
    pendidikan: requiredText(input.pendidikan, "pendidikan"),
    contactPhone: phone,
    statusPernikahan: requiredText(input.statusPernikahan, "status_pernikahan"),
    agama: requiredText(input.agama, "agama"),
    negara: requiredText(input.negara, "negara"),
    provinsi: requiredText(input.provinsi, "provinsi", 2, 100),
    kotaKabupaten: requiredText(input.kotaKabupaten, "kota_kabupaten", 2, 100),
    alamatLengkap: requiredText(input.alamatLengkap, "alamat_lengkap", 10, 300),
  };
}

export class ClientModule {
  constructor(private readonly db: PersistenceAdapter) {}

  async findOrCreateGoogleClient(args: { googleSubject: string; email: string; displayName: string }): Promise<{ id: string; profileComplete: boolean }> {
    const existing = await this.db.query<{ id: string; profile_complete: number }>({
      sql: `SELECT id,
        CASE WHEN nama_panggilan IS NOT NULL AND date_of_birth IS NOT NULL AND jenis_kelamin IS NOT NULL
          AND pekerjaan IS NOT NULL AND pendidikan IS NOT NULL AND contact_phone IS NOT NULL
          AND status_pernikahan IS NOT NULL AND agama IS NOT NULL AND negara IS NOT NULL
          AND provinsi IS NOT NULL AND kota_kabupaten IS NOT NULL AND alamat_lengkap IS NOT NULL
        THEN 1 ELSE 0 END AS profile_complete
        FROM client WHERE google_subject = ? OR contact_email = ? LIMIT 1`,
      params: [args.googleSubject, args.email],
    });
    const found = existing.rows[0];
    if (found) {
      await this.db.batch([{ sql: `UPDATE client SET google_subject = ?, contact_email = ?, contact_email_verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`, params: [args.googleSubject, args.email, found.id] }]);
      return { id: found.id, profileComplete: found.profile_complete === 1 };
    }
    const id = randomUUID();
    await this.db.batch([{ sql: `INSERT INTO client (id, display_name, contact_email, contact_email_verified_at, google_subject) VALUES (?, ?, ?, datetime('now'), ?)`, params: [id, args.displayName || args.email, args.email, args.googleSubject] }]);
    return { id, profileComplete: false };
  }

  async getProfile(clientId: string): Promise<ClientProfile | null> {
    const { rows } = await this.db.query<Record<string, unknown>>({ sql: `SELECT * FROM client WHERE id = ?`, params: [clientId] });
    const r = rows[0];
    if (!r) return null;
    const profileComplete = Boolean(r.nama_panggilan && r.date_of_birth && r.jenis_kelamin && r.pekerjaan && r.pendidikan && r.contact_phone && r.status_pernikahan && r.agama && r.negara && r.provinsi && r.kota_kabupaten && r.alamat_lengkap);
    return { id: String(r.id), googleSubject: String(r.google_subject ?? ""), email: String(r.contact_email), profileComplete, namaPanggilan: String(r.nama_panggilan ?? ""), dateOfBirth: String(r.date_of_birth ?? ""), jenisKelamin: String(r.jenis_kelamin ?? ""), pekerjaan: String(r.pekerjaan ?? ""), pendidikan: String(r.pendidikan ?? ""), contactPhone: String(r.contact_phone ?? ""), statusPernikahan: String(r.status_pernikahan ?? ""), agama: String(r.agama ?? ""), negara: String(r.negara ?? ""), provinsi: String(r.provinsi ?? ""), kotaKabupaten: String(r.kota_kabupaten ?? ""), alamatLengkap: String(r.alamat_lengkap ?? "") };
  }

  async saveProfile(clientId: string, input: ClientProfileInput, now = new Date()): Promise<void> {
    const p = validateClientProfile(input, now);
    const fields = ["nama_panggilan","date_of_birth","jenis_kelamin","pekerjaan","pendidikan","contact_phone","status_pernikahan","agama","negara","provinsi","kota_kabupaten","alamat_lengkap"];
    await this.db.batch([
      { sql: `UPDATE client SET nama_panggilan=?, date_of_birth=?, jenis_kelamin=?, pekerjaan=?, pendidikan=?, contact_phone=?, status_pernikahan=?, agama=?, negara=?, provinsi=?, kota_kabupaten=?, alamat_lengkap=?, display_name=?, updated_at=datetime('now') WHERE id=?`, params: [p.namaPanggilan,p.dateOfBirth,p.jenisKelamin,p.pekerjaan,p.pendidikan,p.contactPhone,p.statusPernikahan,p.agama,p.negara,p.provinsi,p.kotaKabupaten,p.alamatLengkap,p.namaPanggilan,clientId] },
      { sql: `INSERT INTO client_profile_audit (id, client_id, changed_fields) VALUES (?, ?, ?)`, params: [randomUUID(), clientId, JSON.stringify(fields)] },
    ]);
  }
}

export function profileInputFromForm(body: Record<string, unknown>): ClientProfileInput {
  return { namaPanggilan: String(body.namaPanggilan ?? ""), dateOfBirth: String(body.dateOfBirth ?? ""), jenisKelamin: String(body.jenisKelamin ?? ""), pekerjaan: String(body.pekerjaan ?? ""), pendidikan: String(body.pendidikan ?? ""), contactPhone: String(body.contactPhone ?? ""), statusPernikahan: String(body.statusPernikahan ?? ""), agama: String(body.agama ?? ""), negara: String(body.negara ?? "Indonesia"), provinsi: String(body.provinsi ?? ""), kotaKabupaten: String(body.kotaKabupaten ?? ""), alamatLengkap: String(body.alamatLengkap ?? "") };
}
