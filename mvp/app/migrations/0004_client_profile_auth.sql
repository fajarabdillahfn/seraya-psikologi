-- S02/S03 client profile and Google identity fields.
ALTER TABLE client ADD COLUMN google_subject TEXT;
ALTER TABLE client ADD COLUMN nama_panggilan TEXT;
ALTER TABLE client ADD COLUMN jenis_kelamin TEXT;
ALTER TABLE client ADD COLUMN pekerjaan TEXT;
ALTER TABLE client ADD COLUMN pendidikan TEXT;
ALTER TABLE client ADD COLUMN status_pernikahan TEXT;
ALTER TABLE client ADD COLUMN agama TEXT;
ALTER TABLE client ADD COLUMN negara TEXT;
ALTER TABLE client ADD COLUMN provinsi TEXT;
ALTER TABLE client ADD COLUMN kota_kabupaten TEXT;
ALTER TABLE client ADD COLUMN alamat_lengkap TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_google_subject
  ON client(google_subject) WHERE google_subject IS NOT NULL;

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

UPDATE client SET google_subject = NULL WHERE google_subject = '';
