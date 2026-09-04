-- Repair for remote databases where 0004 was marked applied before its
-- statements completed. This migration documents the missing auth tables.
-- Profile columns are added by the deployment repair command only when absent;
-- fresh databases receive them from 0004 before this migration.

CREATE TABLE IF NOT EXISTS client_session (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  token_hash TEXT NOT NULL UNIQUE,
  return_to TEXT NOT NULL DEFAULT '/book',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_session_token
  ON client_session(token_hash, expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS oauth_state (
  state TEXT PRIMARY KEY,
  return_to TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_expiry ON oauth_state(expires_at);

CREATE TABLE IF NOT EXISTS client_profile_audit (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES client(id),
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  changed_fields TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_profile_audit_client
  ON client_profile_audit(client_id, changed_at);
