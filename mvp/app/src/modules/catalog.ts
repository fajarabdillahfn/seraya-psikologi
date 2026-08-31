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