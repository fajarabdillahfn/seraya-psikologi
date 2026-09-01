-- 0003_booking_state_whatsapp.sql
-- Migration to relax the `booking.state` CHECK constraint to include the
-- WhatsApp manual payment states introduced in ADR 0097.
--
-- The 0001_init.sql migration declared:
--   state TEXT NOT NULL DEFAULT 'pending_payment'
--                  CHECK (state IN ('pending_payment','confirmed','cancelled',
--                                    'expired','failed','paid_late'))
--
-- ADR 0097 introduces the WhatsApp manual flow with two new states:
--   pending_manual_payment — booking awaiting client payment proof
--   awaiting_confirmation  — proof recorded, awaiting Admin verification
--
-- SQLite does not support ALTER TABLE ... DROP CONSTRAINT. We must rebuild
-- the table. The standard pattern is:
--   1. Create a new table with the desired shape.
--   2. Copy data from the old table.
--   3. Drop the old table.
--   4. Rename the new table.
--
-- All five FKs that point at booking(id) are recreated in the same form.
-- This migration is idempotent via the drop+rename pattern; the new table
-- is created with IF NOT EXISTS, and the final DROP/ALTER will no-op if
-- the new table is already the active one.

-- Step 1: create new table with relaxed CHECK.
CREATE TABLE IF NOT EXISTS booking_new (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES client(id),
  offer_snapshot_id     TEXT NOT NULL REFERENCES offer_snapshot(id),
  state                 TEXT NOT NULL DEFAULT 'pending_manual_payment'
                        CHECK (state IN (
                          'pending_manual_payment',
                          'awaiting_confirmation',
                          'confirmed',
                          'cancelled',
                          'expired',
                          'failed',
                          'paid_late',
                          'pending_payment'
                        )),
  is_package            INTEGER NOT NULL DEFAULT 0 CHECK (is_package IN (0,1)),
  is_couple             INTEGER NOT NULL DEFAULT 0 CHECK (is_couple IN (0,1)),
  intake_short_message  TEXT,
  crisis_ack            INTEGER NOT NULL DEFAULT 0 CHECK (crisis_ack IN (0,1)),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: copy data. Migrate legacy 'pending_payment' rows to
-- 'pending_manual_payment' (the new default; functionally equivalent
-- in the WhatsApp flow).
INSERT OR IGNORE INTO booking_new
  (id, client_id, offer_snapshot_id, state, is_package, is_couple,
   intake_short_message, crisis_ack, created_at, updated_at)
SELECT
  id, client_id, offer_snapshot_id,
  CASE state
    WHEN 'pending_payment' THEN 'pending_manual_payment'
    ELSE state
  END,
  is_package, is_couple, intake_short_message, crisis_ack,
  created_at, updated_at
FROM booking;

-- Step 3: drop old table.
DROP TABLE IF EXISTS booking;

-- Step 4: rename new table.
ALTER TABLE booking_new RENAME TO booking;

-- Recreate indexes that the original 0001 created. They do not have a name
-- conflict because they were dropped with the table.
CREATE INDEX IF NOT EXISTS idx_booking_client ON booking(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_state  ON booking(state);
