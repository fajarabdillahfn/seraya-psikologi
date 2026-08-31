/**
 * AvailabilityModule — slot generation, listing, withdrawal.
 * ADR 0089 §5.1, ADR 0091 §6.
 *
 * Notes:
 * - Slot grid is 30 minutes (ADR 0091).
 * - TransitionBuffer 15 minutes is applied symmetrically around
 *   appointment for overlap detection (CapacityReservation).
 * - Slot generation runs from availability_rule / availability_exception
 *   into availability_slot rows for a 90-day rolling horizon (ADR 0040).
 *
 * The MVP ships a small regeneration helper. Full generation pipeline
 * (90-day window, exception overrides) lives in Slice 1 follow-up.
 */

import type { PersistenceAdapter } from "../persistence/adapter";
import { randomUUID } from "node:crypto";

const SLOT_GRID_MINUTES = 30;
const BOOKING_HORIZON_DAYS = 90;
const DEFAULT_TRANSITION_BUFFER_MIN = 15;

export interface AvailabilitySlotRow {
  id: string;
  psychologist_id: string;
  offering_id: string;
  starts_at_utc: string;
  ends_at_utc: string;
  withdrawn: number;
}

export class AvailabilityModule {
  constructor(private readonly db: PersistenceAdapter) {}

  /**
   * List currently-available slots for an offering within the next
   * 90 days, excluding those with active capacity reservations.
   */
  async listAvailableSlots(args: {
    offeringId: string;
    now: Date;
  }): Promise<AvailabilitySlotRow[]> {
    const horizonEnd = new Date(
      args.now.getTime() + BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000
    );
    const { rows } = await this.db.query<AvailabilitySlotRow>({
      sql: `SELECT s.* FROM availability_slot s
            LEFT JOIN capacity_reservation cr
              ON cr.parent_id = s.id
              AND cr.state IN ('hold_active','confirmed')
            WHERE s.offering_id = ?
              AND s.withdrawn = 0
              AND s.starts_at_utc >= ?
              AND s.ends_at_utc <= ?
              AND cr.id IS NULL
            ORDER BY s.starts_at_utc ASC`,
      params: [
        args.offeringId,
        args.now.toISOString(),
        horizonEnd.toISOString(),
      ],
    });
    return rows;
  }

  /**
   * Generate candidate slots for the next 90 days from a single
   * availability_rule. Used during the Slice 1 backfill step.
   * Idempotent via UNIQUE(psychologist_id, starts_at_utc) on the table.
   *
   * Placeholder implementation: computes a few illustrative slots for
   * the next 14 days within the rule's local window. Full generation
   * (multi-rule, exceptions, holiday handling) is a Slice 1 ticket.
   */
  async generateSlotsForRule(args: {
    psychologistId: string;
    offeringId: string;
    weekday: number;
    startsAtLocal: string; // 'HH:MM' Asia/Jakarta
    endsAtLocal: string;
    effectiveFrom: string; // 'YYYY-MM-DD'
    effectiveTo?: string | null;
    durationMinutes: number;
    transitionBufferMin?: number;
    now: Date;
  }): Promise<{ created: number }> {
    const buffer = args.transitionBufferMin ?? DEFAULT_TRANSITION_BUFFER_MIN;
    const horizonEnd = new Date(
      args.now.getTime() + BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000
    );
    const inserts: { sql: string; params: unknown[] }[] = [];
    const cursor = new Date(args.now);
    cursor.setUTCHours(0, 0, 0, 0);
    const [sh, sm] = args.startsAtLocal.split(":").map(Number);
    const [eh, em] = args.endsAtLocal.split(":").map(Number);
    const windowMinutes = eh * 60 + em - (sh * 60 + sm);
    const slotsPerWindow = Math.max(
      1,
      Math.floor(windowMinutes / SLOT_GRID_MINUTES)
    );
    while (cursor <= horizonEnd) {
      if (cursor.getUTCDay() === args.weekday) {
        for (let i = 0; i < slotsPerWindow; i++) {
          const startsAt = new Date(cursor);
          startsAt.setUTCHours(sh, sm + i * SLOT_GRID_MINUTES, 0, 0);
          const endsAt = new Date(
            startsAt.getTime() + SLOT_GRID_MINUTES * 60 * 1000
          );
          inserts.push({
            sql: `INSERT OR IGNORE INTO availability_slot
                  (id, psychologist_id, offering_id, starts_at_utc, ends_at_utc, withdrawn)
                  VALUES (?, ?, ?, ?, ?, 0)`,
            params: [
              randomUUID(),
              args.psychologistId,
              args.offeringId,
              startsAt.toISOString(),
              endsAt.toISOString(),
            ],
          });
        }
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    if (inserts.length > 0) {
      await this.db.batch(inserts);
    }
    return { created: inserts.length };
  }

  /**
   * Pre-flight overlap check before creating a CapacityReservation.
   * Returns true if no active reservation overlaps the proposed window.
   * ADR 0091 §6.
   */
  async isSlotAvailable(args: {
    psychologistId: string;
    startsAtUtc: string;
    endsAtUtc: string;
  }): Promise<boolean> {
    const { rows } = await this.db.query<{ count: number }>({
      sql: `SELECT COUNT(*) AS count FROM capacity_reservation
            WHERE psychologist_id = ?
              AND state IN ('hold_active','confirmed')
              AND NOT (ends_at_utc <= ? OR starts_at_utc >= ?)`,
      params: [
        args.psychologistId,
        args.startsAtUtc,
        args.endsAtUtc,
      ],
    });
    const n = rows[0]?.count ?? 0;
    return n === 0;
  }
}