-- 0002_whatsapp_payment.sql
--
-- Migrate payment capture from Midtrans-gateway-driven (Payment/PaymentEvent/
-- RefundAction) to WhatsApp manual-confirmation-driven (PaymentProof) per
-- ADR 0097.
--
-- Rationale: the launch payment flow is WhatsApp manual — client sends proof
-- (screenshot + amount + method) to admin via WhatsApp; admin verifies and
-- marks the booking paid in the workspace. Midtrans integration is deferred
-- to a later slice; the Midtrans-specific tables from 0001 are dropped here
-- so the runtime code in app/src/modules/{payment,admin}.ts stays focused on
-- the manual flow.
--
-- Idempotency: every DROP uses IF EXISTS and every CREATE uses IF NOT EXISTS,
-- so re-running the migration (or applying on top of an existing 0001 state)
-- is safe. Wrangler's `d1 migrations apply` tracks applied versions in
-- `d1_migrations`, so this file is normally applied exactly once; the
-- IF EXISTS / IF NOT EXISTS guards exist for human-driven re-runs.
--
-- Conventions (matching 0001_init.sql):
--   * `*_at` timestamps are ISO 8601 text in UTC. Convert to Asia/Jakarta
--     at presentation only.
--   * Primary key row id is server-generated UUID string (TEXT).
--   * All FK columns are TEXT.
--
-- Field shape is dictated by app/src/domain/types.ts (PaymentProof) and the
-- SQL in app/src/modules/{payment,admin}.ts — this migration MUST match
-- those exactly so the runtime code can compile and run.

-- ---------------------------------------------------------------------------
-- Drop Midtrans-specific payment tables (ADR 0068 deferred)
-- ---------------------------------------------------------------------------
-- Drop order respects FKs: payment_event and refund_action both reference
-- payment(id), so children must be dropped before the parent.

DROP TABLE IF EXISTS refund_action;
DROP TABLE IF EXISTS payment_event;
DROP TABLE IF EXISTS payment;

-- ---------------------------------------------------------------------------
-- PaymentProof (WhatsApp manual payment flow, ADR 0097)
-- ---------------------------------------------------------------------------
-- One row per proof submission. UNIQUE(booking_id) enforces at-most-one proof
-- per booking; `recordPayment` in app/src/modules/payment.ts is idempotent on
-- this constraint (returns the existing row instead of inserting).
--
-- Lifecycle (status enum):
--   submitted  -> recorded by Admin from client WhatsApp message; awaiting review
--   verified   -> Admin accepted; booking.state transitions to 'confirmed'
--   rejected   -> Admin rejected with reason; booking.state transitions to 'cancelled'
--
-- Field-by-field mapping to app/src/domain/types.ts PaymentProof:
--   id                        TEXT, server-generated UUID
--   booking_id                TEXT NOT NULL -> booking(id)
--   payment_method            TEXT NOT NULL; CHECK per app/src/worker/index.ts
--                                            ('qris','bank_transfer','cash')
--   evidence_url              TEXT; nullable per recordPayment signature
--   evidence_note             TEXT; nullable per recordPayment signature
--   recorded_by_membership_id TEXT -> staff_membership(id); admin who recorded
--   recorded_at               TEXT NOT NULL DEFAULT (datetime('now'))
--   verified_by_membership_id TEXT -> staff_membership(id); NULL while submitted
--   verified_at               TEXT; ISO 8601 UTC; NULL while submitted/rejected
--   status                    TEXT NOT NULL DEFAULT 'submitted'
--   rejection_reason          TEXT; required when status='rejected' (app-enforced)

CREATE TABLE IF NOT EXISTS payment_proof (
  id                        TEXT PRIMARY KEY,
  booking_id                TEXT NOT NULL UNIQUE REFERENCES booking(id),
  payment_method            TEXT NOT NULL
                            CHECK (payment_method IN ('qris','bank_transfer','cash')),
  evidence_url              TEXT,
  evidence_note             TEXT,
  recorded_by_membership_id TEXT REFERENCES staff_membership(id),
  recorded_at               TEXT NOT NULL DEFAULT (datetime('now')),
  verified_by_membership_id TEXT REFERENCES staff_membership(id),
  verified_at               TEXT,
  status                    TEXT NOT NULL DEFAULT 'submitted'
                            CHECK (status IN ('submitted','verified','rejected')),
  rejection_reason          TEXT
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Admin inbox: pending proofs in chronological order. Status filter is
-- partial — most rows settle to terminal status, so the index stays small.
CREATE INDEX IF NOT EXISTS idx_payment_proof_pending
  ON payment_proof(recorded_at)
  WHERE status = 'submitted';

-- Audit: who verified what, when. Partial on verified proofs only.
CREATE INDEX IF NOT EXISTS idx_payment_proof_verified_by
  ON payment_proof(verified_by_membership_id, verified_at)
  WHERE verified_by_membership_id IS NOT NULL;
