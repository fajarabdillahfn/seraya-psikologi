/**
 * D1 Adapter — implements PersistenceAdapter using Cloudflare D1.
 * ADR 0089 §6.4-§6.6.
 *
 * Notes:
 * - `query()` issues a single `db.prepare(sql).bind(...).all()`. Only
 *   for read paths.
 * - `batch()` issues `db.batch([stmt, stmt, ...])` for atomicity.
 *   Statements within one batch run in one implicit transaction with
 *   SERIALIZABLE-equivalent semantics per CF docs.
 * - For commands that need SELECT-then-INSERT atomically (e.g. capacity
 *   overlap precheck + INSERT), the pattern is:
 *     1. SELECT inside the batch (read snapshot);
 *     2. INSERT inside the same batch;
 *     3. If precheck condition fails, the INSERT statement returns
 *        and we surface a typed error to the caller. Cross-invocation
 *        atomicity is enforced by the application code's atomicity
 *        contract (see ADR 0091 §6 for the canonical SQL flavor).
 */

import type {
  AdapterBatchResult,
  AdapterQuery,
  PersistenceAdapter,
  PersistenceEnv,
} from "./adapter";

export class D1PersistenceAdapter implements PersistenceAdapter {
  constructor(private readonly env: PersistenceEnv) {
    if (!env.DB) {
      throw new Error("D1PersistenceAdapter requires env.DB binding");
    }
  }

  async query<T = unknown>(q: AdapterQuery): Promise<AdapterBatchResult<T>> {
    const stmt = this.env.DB!.prepare(q.sql).bind(...(q.params ?? []));
    const result = await stmt.all<T>();
    return {
      rows: (result.results ?? []) as T[],
      rows_read: (result.meta as { rows_read?: number } | undefined)?.rows_read ?? 0,
      rows_written: (result.meta as { rows_written?: number } | undefined)?.rows_written ?? 0,
      meta: result.meta,
    };
  }

  async execute<T = unknown>(q: AdapterQuery): Promise<AdapterBatchResult<T>> {
    const result = await this.env.DB!.prepare(q.sql).bind(...(q.params ?? [])).run();
    return {
      rows: ((result as unknown as { results?: T[] }).results ?? []) as T[],
      rows_read: 0,
      rows_written: (result.meta as { changes?: number } | undefined)?.changes ?? 0,
      meta: result.meta,
    };
  }

  async batch<T = unknown>(
    queries: AdapterQuery[]
  ): Promise<AdapterBatchResult<T>> {
    const statements = queries.map((q) =>
      this.env.DB!.prepare(q.sql).bind(...(q.params ?? []))
    );
    const result = await this.env.DB!.batch<T>(statements as never);
    return {
      rows: (result as unknown as { results?: T[] }).results ?? ([] as T[]),
      rows_read: 0,
      rows_written: queries.length,
      meta: result,
    };
  }
}

export function createAdapter(env: PersistenceEnv): PersistenceAdapter {
  return new D1PersistenceAdapter(env);
}