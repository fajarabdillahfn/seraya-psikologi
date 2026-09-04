/**
 * PersistenceAdapter — ADR 0089 §6 single seam for database access.
 *
 * All modules that touch the database must go through this interface.
 * The D1 driver implements it in `d1-adapter.ts`. A future Postgres
 * implementation rewrites the adapter only; domain modules are not
 * affected. This is enforced as a code-review gate.
 */

export type AdapterMode = "tx" | "query" | "batch";

export interface AdapterQuery {
  sql: string;
  params?: unknown[];
}

export interface AdapterBatchResult<T = unknown> {
  rows: T[];
  rows_read: number;
  rows_written: number;
  meta?: unknown;
}

export interface PersistenceAdapter {
  /**
   * Execute a single SELECT statement. Use only for read paths.
   * Single-statement writes should use `batch` for atomicity.
   */
  query<T = unknown>(q: AdapterQuery): Promise<AdapterBatchResult<T>>;

  /**
   * Execute a single batch of statements. Inside one batch, statements
   * run in one implicit transaction with SERIALIZABLE-equivalent
   * semantics per D1. Use for any command that mutates multiple rows
   * (`ApplyVerifiedPaymentEvent`, `DecideCancellation` approve,
   * `ConsumeEntitlement`, `RestoreEntitlement`, `ExecuteRefundAction`).
   */
  batch<T = unknown>(queries: AdapterQuery[]): Promise<AdapterBatchResult<T>>;

  /** Execute one mutation with the driver's native single-statement method. */
  execute?<T = unknown>(q: AdapterQuery): Promise<AdapterBatchResult<T>>;
}

export interface PersistenceEnv {
  DB?: D1Database;       // Cloudflare D1 binding
  ENVIRONMENT?: string;  // 'development' | 'staging' | 'production'
}