/**
 * CatalogModule — read-only catalog queries and OfferSnapshot creation.
 * ADR 0089 §5.1.
 *
 * Public surface: list published service offerings, list service packages,
 * create an OfferSnapshot at booking time, list published psychologists.
 */

import type { PersistenceAdapter } from "../persistence/adapter";
import { randomUUID } from "node:crypto";

export interface ServiceOfferingRow {
  id: string;
  service_id: string;
  psychologist_id: string;
  mode: "online" | "offline";
  duration_minutes: number;
  transition_buffer_min: number;
  audience: "individual" | "couple";
  active: number;
  created_at: string;
}

export interface ServicePackageRow {
  id: string;
  offering_id: string;
  name: string;
  session_count: number;
  total_price_idr: number;
  sequence_label: string | null;
  active: number;
}

export interface PsychologistRow {
  id: string;
  display_name: string;
  publish_status: string;
  bio: string | null;
  expertise: string | null;
  education: string | null;
  photo_url: string | null;
}

export interface OfferSnapshotRow {
  id: string;
  offering_id: string;
  package_id: string | null;
  price_idr: number;
  currency: string;
  duration_minutes: number;
  transition_buffer_min: number;
  mode: string;
  policy_version: string;
  created_at: string;
}

export class CatalogModule {
  constructor(private readonly db: PersistenceAdapter) {}

  async getPublishedOffering(id: string): Promise<ServiceOfferingRow | null> {
    const { rows } = await this.db.query<ServiceOfferingRow>({
      sql: `SELECT so.* FROM service_offering so
            JOIN psychologist p ON p.id = so.psychologist_id
            WHERE so.id = ? AND so.active = 1 AND so.audience = 'individual' AND p.publish_status = 'published'`,
      params: [id],
    });
    return rows[0] ?? null;
  }

  async getPublishedOfferingWithDisplay(
    id: string
  ): Promise<(ServiceOfferingRow & { display_name: string; price_idr: number }) | null> {
    const { rows } = await this.db.query<
      ServiceOfferingRow & { display_name: string; price_idr: number }
    >({
      sql: `SELECT so.*, s.display_name, sor.price_idr
            FROM service_offering so
            JOIN psychologist p ON p.id = so.psychologist_id
            JOIN service s ON s.id = so.service_id
            JOIN service_offering_revision sor ON sor.offering_id = so.id
            WHERE so.id = ? AND so.active = 1 AND so.audience = 'individual'
              AND p.publish_status = 'published'
              AND sor.version = (SELECT MAX(version) FROM service_offering_revision WHERE offering_id = so.id)`,
      params: [id],
    });
    return rows[0] ?? null;
  }

  async getCurrentPrice(offeringId: string): Promise<number | null> {
    const { rows } = await this.db.query<{ price_idr: number }>({
      sql: `SELECT price_idr FROM service_offering_revision WHERE offering_id = ? ORDER BY version DESC LIMIT 1`,
      params: [offeringId],
    });
    return rows[0]?.price_idr ?? null;
  }

  async createCurrentOfferSnapshot(offeringId: string, policyVersion = "v1"): Promise<OfferSnapshotRow> {
    const { rows } = await this.db.query<{
      mode: "online" | "offline";
      duration_minutes: number;
      transition_buffer_min: number;
      price_idr: number;
    }>({
      sql: `SELECT so.mode, sor.duration_minutes, sor.transition_buffer_min, sor.price_idr
            FROM service_offering so
            JOIN service_offering_revision sor ON sor.offering_id = so.id
            WHERE so.id = ? AND so.active = 1 AND so.audience = 'individual'
            ORDER BY sor.version DESC LIMIT 1`,
      params: [offeringId],
    });
    const current = rows[0];
    if (!current) throw new Error("offering not found or not bookable");
    return this.createOfferSnapshot({
      offeringId,
      packageId: null,
      priceIdr: current.price_idr,
      durationMinutes: current.duration_minutes,
      transitionBufferMin: current.transition_buffer_min,
      mode: current.mode,
      policyVersion,
    });
  }

  async listPublishedOfferings(): Promise<ServiceOfferingRow[]> {
    const { rows } = await this.db.query<ServiceOfferingRow>({
      sql: `SELECT * FROM service_offering WHERE active = 1
            AND psychologist_id IN (
              SELECT id FROM psychologist WHERE publish_status = 'published'
            )
            ORDER BY audience, mode`,
    });
    return rows;
  }

  async listPublishedPackages(): Promise<ServicePackageRow[]> {
    const { rows } = await this.db.query<ServicePackageRow>({
      sql: `SELECT * FROM service_package WHERE active = 1
            AND offering_id IN (
              SELECT id FROM service_offering WHERE active = 1
                AND psychologist_id IN (
                  SELECT id FROM psychologist WHERE publish_status = 'published'
                )
            )
            ORDER BY offering_id, session_count`,
    });
    return rows;
  }

  async listPublishedPsychologists(): Promise<PsychologistRow[]> {
    const { rows } = await this.db.query<PsychologistRow>({
      sql: `SELECT id, display_name, publish_status, bio, expertise, education, photo_url
            FROM psychologist WHERE publish_status = 'published'
            ORDER BY display_name`,
    });
    return rows;
  }

  async listBookableOfferings(psychologistId?: string): Promise<Array<ServiceOfferingRow & { display_name: string; price_idr: number }>> {
    const params: unknown[] = [];
    let filter = "";
    if (psychologistId) { filter = " AND so.psychologist_id = ?"; params.push(psychologistId); }
    const { rows } = await this.db.query<ServiceOfferingRow & { display_name: string; price_idr: number }>({
      sql: `SELECT so.*, s.display_name, sor.price_idr
            FROM service_offering so
            JOIN service s ON s.id = so.service_id
            JOIN service_offering_revision sor ON sor.offering_id = so.id
            WHERE so.active = 1 AND so.audience = 'individual'
              AND so.id LIKE 'off_%'
              AND so.psychologist_id IN (SELECT id FROM psychologist WHERE publish_status = 'published')${filter}
              AND sor.version = (SELECT MAX(version) FROM service_offering_revision WHERE offering_id = so.id)
            ORDER BY so.psychologist_id, so.mode, s.display_name`,
      params,
    });
    return rows;
  }

  async getPsychologist(id: string): Promise<PsychologistRow | null> {
    const { rows } = await this.db.query<PsychologistRow>({
      sql: `SELECT id, display_name, publish_status, bio, expertise, education, photo_url
            FROM psychologist WHERE id = ? AND publish_status = 'published'`,
      params: [id],
    });
    return rows[0] ?? null;
  }

  async createOfferSnapshot(args: {
    offeringId: string;
    packageId: string | null;
    priceIdr: number;
    durationMinutes: number;
    transitionBufferMin: number;
    mode: "online" | "offline";
    policyVersion: string;
  }): Promise<OfferSnapshotRow> {
    const id = randomUUID();
    await this.db.batch([
      {
        sql: `INSERT INTO offer_snapshot
              (id, offering_id, package_id, price_idr, currency, duration_minutes,
               transition_buffer_min, mode, policy_version)
              VALUES (?, ?, ?, ?, 'IDR', ?, ?, ?, ?)`,
        params: [
          id,
          args.offeringId,
          args.packageId,
          args.priceIdr,
          args.durationMinutes,
          args.transitionBufferMin,
          args.mode,
          args.policyVersion,
        ],
      },
    ]);
    const { rows } = await this.db.query<OfferSnapshotRow>({
      sql: `SELECT * FROM offer_snapshot WHERE id = ?`,
      params: [id],
    });
    const snap = rows[0];
    if (!snap) throw new Error("OfferSnapshot insert did not persist");
    return snap;
  }
}