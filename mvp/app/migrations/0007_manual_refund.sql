-- Manual refund workflow. Refund completion is impossible without evidence.
CREATE TABLE IF NOT EXISTS manual_refund (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES booking(id),
  amount_idr INTEGER NOT NULL CHECK (amount_idr >= 0),
  reason_category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'denied')),
  created_by_membership_id TEXT NOT NULL REFERENCES staff_membership(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_by_membership_id TEXT REFERENCES staff_membership(id),
  completed_at TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_manual_refund_status
  ON manual_refund(status, created_at);
