-- Evidence uploaded/recorded by Admin for cancellation and refund operations.
CREATE TABLE IF NOT EXISTS admin_evidence (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES booking(id),
  evidence_kind TEXT NOT NULL CHECK (evidence_kind IN ('cancellation_whatsapp', 'refund_transfer')),
  storage_reference TEXT NOT NULL,
  note TEXT,
  recorded_by_membership_id TEXT REFERENCES staff_membership(id),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_evidence_booking
  ON admin_evidence(booking_id, evidence_kind, recorded_at);
