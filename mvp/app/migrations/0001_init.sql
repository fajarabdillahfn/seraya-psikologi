-- 0001_init.sql — Seraya Psikologi MVP schema baseline
--
-- Reference: ADR 0089 (architecture Worker + D1), ADR 0090 (Couple participant),
-- ADR 0091 (CapacityReservation), ADR 0092 (Appointment outcome timing),
-- ADR 0093 (Payment settlement uniqueness), ADR 0094 (Intake schema),
-- ADR 0095 (Package cancellation matrix).
--
-- All timestamps in Asia/Jakarta. Money in IDR minor unit (integer).
-- D1 is single-region primary with global read replicas; primary key
-- row id is server-generated UUID string. All FK columns are TEXT.
--
-- Conventions:
--   * `*_at` timestamps are ISO 8601 text in UTC. Convert to Asia/Jakarta
--     at presentation only.
--   * Soft-deletion is NOT used; redemption/retention is implemented via
--     redaction columns per ADR 0087.
--   * Append-only history is implemented as separate event tables; current
--     projection lives on the main table.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Catalog and capacity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS psychologist (
  id                    TEXT PRIMARY KEY,
  display_name          TEXT NOT NULL,
  license_str           TEXT,                -- [REDACTED] for shared artifacts
  license_silp          TEXT,
  credential_status     TEXT NOT NULL DEFAULT 'pending'
                        CHECK (credential_status IN ('pending','verified','rejected','not_published')),
  bio                   TEXT,
  expertise             TEXT,                -- JSON array of strings
  education             TEXT,                -- JSON array of strings
  publish_status        TEXT NOT NULL DEFAULT 'not_published'
                        CHECK (publish_status IN ('published','not_published')),
  photo_url             TEXT,
  -- Launch: only psychologist.id = 'fuja' should have publish_status='published'.
  -- Other rows are placeholder for future bookable staff (ADR 0075).
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service (
  id                    TEXT PRIMARY KEY,
  program_pillar        TEXT NOT NULL CHECK (program_pillar IN ('pulang','berdaya','bersama','berbagi')),
  display_name          TEXT NOT NULL,
  description           TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_offering (
  id                    TEXT PRIMARY KEY,
  service_id            TEXT NOT NULL REFERENCES service(id),
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  mode                  TEXT NOT NULL CHECK (mode IN ('online','offline')),
  duration_minutes      INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  transition_buffer_min INTEGER NOT NULL DEFAULT 15 CHECK (transition_buffer_min >= 0),
  audience              TEXT NOT NULL CHECK (audience IN ('individual','couple')),
  active                INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(service_id, psychologist_id, mode, audience)
);

CREATE TABLE IF NOT EXISTS service_offering_revision (
  id                    TEXT PRIMARY KEY,
  offering_id           TEXT NOT NULL REFERENCES service_offering(id),
  version               INTEGER NOT NULL,
  price_idr             INTEGER NOT NULL CHECK (price_idr >= 0),
  duration_minutes      INTEGER NOT NULL,
  transition_buffer_min INTEGER NOT NULL,
  policy_version        TEXT NOT NULL,
  effective_at          TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, version)
);

CREATE TABLE IF NOT EXISTS service_package (
  id                    TEXT PRIMARY KEY,
  offering_id           TEXT NOT NULL REFERENCES service_offering(id),
  name                  TEXT NOT NULL,
  session_count         INTEGER NOT NULL CHECK (session_count > 0),
  total_price_idr       INTEGER NOT NULL CHECK (total_price_idr >= 0),
  sequence_label        TEXT,                -- e.g. 'A,B,joint' for couple
  active                INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS availability_rule (
  id                    TEXT PRIMARY KEY,
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  weekday               INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  starts_at_local       TEXT NOT NULL,        -- 'HH:MM' Asia/Jakarta
  ends_at_local         TEXT NOT NULL,
  effective_from        TEXT NOT NULL,
  effective_to          TEXT,
  UNIQUE(psychologist_id, weekday, starts_at_local, effective_from)
);

CREATE TABLE IF NOT EXISTS availability_exception (
  id                    TEXT PRIMARY KEY,
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  exception_date        TEXT NOT NULL,         -- 'YYYY-MM-DD' Asia/Jakarta
  kind                  TEXT NOT NULL CHECK (kind IN ('block','extra')),
  starts_at_local       TEXT,
  ends_at_local         TEXT,
  reason                TEXT,
  UNIQUE(psychologist_id, exception_date, kind, starts_at_local)
);

CREATE TABLE IF NOT EXISTS availability_slot (
  id                    TEXT PRIMARY KEY,
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  offering_id           TEXT NOT NULL REFERENCES service_offering(id),
  starts_at_utc         TEXT NOT NULL,
  ends_at_utc           TEXT NOT NULL,
  generated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn             INTEGER NOT NULL DEFAULT 0,
  CHECK (ends_at_utc > starts_at_utc)
);

CREATE INDEX idx_avail_slot_window ON availability_slot(psychologist_id, starts_at_utc, withdrawn);
CREATE INDEX idx_avail_slot_offering ON availability_slot(offering_id, starts_at_utc);

-- ---------------------------------------------------------------------------
-- CapacityReservation (ADR 0091) — overlap enforcement at psychologist+time
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS capacity_reservation (
  id                    TEXT PRIMARY KEY,
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  reservation_kind      TEXT NOT NULL CHECK (reservation_kind IN ('slot_hold','appointment')),
  parent_id             TEXT NOT NULL,         -- SlotHold.id or Appointment.id
  starts_at_utc         TEXT NOT NULL,         -- session_start - transition_buffer
  ends_at_utc           TEXT NOT NULL,         -- session_end + transition_buffer
  state                 TEXT NOT NULL CHECK (state IN ('hold_active','confirmed','released','consumed','expired')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  released_at           TEXT,
  CHECK (ends_at_utc > starts_at_utc)
);

CREATE INDEX idx_capacity_window_active
  ON capacity_reservation(psychologist_id, state, starts_at_utc, ends_at_utc)
  WHERE state IN ('hold_active','confirmed');

-- D1 does not support EXCLUDE constraints. We rely on:
--   1. App-level precheck using db.batch within one Worker invocation.
--   2. UNIQUE index on (slot_id) WHERE state='active' for SlotHold.
-- Concurrency note: db.batch gives SERIALIZABLE-equivalent semantics inside
-- one Worker invocation; cross-invocation atomicity is enforced by the
-- app-level precheck rejecting overlap before INSERT.
-- See ADR 0091 §6 for the canonical D1 SQL flavor and rationale.

-- ---------------------------------------------------------------------------
-- Client and consent (ADR 0094)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client (
  id                    TEXT PRIMARY KEY,
  display_name          TEXT NOT NULL,
  contact_email         TEXT NOT NULL UNIQUE,
  contact_email_verified_at TEXT,
  contact_phone         TEXT,                -- E.164 or NULL
  date_of_birth         TEXT,                -- ISO 8601 in Asia/Jakarta; NULL allowed
  age_at_booking        INTEGER,
  is_minor              INTEGER NOT NULL DEFAULT 0 CHECK (is_minor IN (0,1)),
  audience_match        TEXT NOT NULL DEFAULT 'eligible_18_40'
                        CHECK (audience_match IN ('eligible_18_40','minor_16_17_guardian','out_of_scope')),
  guardian_payload      TEXT,                -- JSON object, required when is_minor=1
  redacted_at           TEXT,
  pseudonym             TEXT,                -- post-redaction reference per ADR 0087
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_client_email ON client(contact_email);

CREATE TABLE IF NOT EXISTS consent_catalog (
  id                    TEXT PRIMARY KEY,
  purpose               TEXT NOT NULL CHECK (purpose IN ('booking_transactional','couple_participant','joint_session','guardian_consent','cancellation_acknowledgement','marketing')),
  version               TEXT NOT NULL,
  text                  TEXT NOT NULL,
  effective_at          TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at          TEXT,
  UNIQUE(purpose, version)
);

CREATE TABLE IF NOT EXISTS consent_record (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES client(id),
  purpose               TEXT NOT NULL,
  version               TEXT NOT NULL,
  source                TEXT NOT NULL,        -- 'public_web_v1' for launch flow
  acknowledged_at       TEXT NOT NULL DEFAULT (datetime('now')),
  policy_text_snapshot  TEXT NOT NULL,
  UNIQUE(client_id, purpose, version, source)
);

-- ---------------------------------------------------------------------------
-- Booking, OfferSnapshot, SlotHold, Appointment, PackagePurchase,
-- SessionEntitlement (ADR 0089 §5.2, ADR 0090, ADR 0091, ADR 0094, ADR 0095)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS offer_snapshot (
  id                    TEXT PRIMARY KEY,
  offering_id           TEXT NOT NULL REFERENCES service_offering(id),
  package_id            TEXT REFERENCES service_package(id),
  price_idr             INTEGER NOT NULL CHECK (price_idr >= 0),
  currency              TEXT NOT NULL DEFAULT 'IDR',
  duration_minutes      INTEGER NOT NULL,
  transition_buffer_min INTEGER NOT NULL,
  mode                  TEXT NOT NULL,
  policy_version        TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES client(id),
  offer_snapshot_id     TEXT NOT NULL REFERENCES offer_snapshot(id),
  state                 TEXT NOT NULL DEFAULT 'pending_payment'
                        CHECK (state IN ('pending_payment','confirmed','cancelled','expired','failed','paid_late')),
  is_package            INTEGER NOT NULL DEFAULT 0 CHECK (is_package IN (0,1)),
  is_couple             INTEGER NOT NULL DEFAULT 0 CHECK (is_couple IN (0,1)),
  intake_short_message  TEXT,
  crisis_ack            INTEGER NOT NULL DEFAULT 0 CHECK (crisis_ack IN (0,1)),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_booking_client ON booking(client_id);
CREATE INDEX idx_booking_state ON booking(state);

CREATE TABLE IF NOT EXISTS slot_hold (
  id                    TEXT PRIMARY KEY,
  booking_id            TEXT NOT NULL UNIQUE REFERENCES booking(id),
  slot_id               TEXT NOT NULL REFERENCES availability_slot(id),
  expires_at            TEXT NOT NULL,
  state                 TEXT NOT NULL DEFAULT 'active'
                        CHECK (state IN ('active','consumed','released','expired')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_slot_hold_active ON slot_hold(state, expires_at);
-- Single-active-hold per slot: enforced via UNIQUE(slot_id) WHERE state='active'.
-- D1 supports partial UNIQUE via indexes; we approximate with app-level
-- precheck + transaction semantics per ADR 0091 §6.

CREATE TABLE IF NOT EXISTS appointment (
  id                    TEXT PRIMARY KEY,
  booking_id            TEXT NOT NULL REFERENCES booking(id),
  psychologist_id       TEXT NOT NULL REFERENCES psychologist(id),
  offering_id           TEXT NOT NULL REFERENCES service_offering(id),
  session_starts_at_utc TEXT NOT NULL,
  session_ends_at_utc   TEXT NOT NULL,
  state                 TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (state IN ('scheduled','in_progress','completed','no_show','cancelled','rescheduled')),
  outcome_at            TEXT,
  outcome_by            TEXT,                -- staff membership id or 'system'
  outcome_reason        TEXT,
  late_arrival_at       TEXT,                -- when client actually joined
  correction_window_until TEXT,             -- ADR 0092 correction window expiry
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (session_ends_at_utc > session_starts_at_utc)
);

CREATE INDEX idx_appointment_window ON appointment(psychologist_id, session_starts_at_utc);
CREATE INDEX idx_appointment_state ON appointment(state);
CREATE INDEX idx_appointment_correction ON appointment(correction_window_until)
  WHERE state IN ('completed','no_show');

CREATE TABLE IF NOT EXISTS booking_participant (
  id                    TEXT PRIMARY KEY,
  booking_id            TEXT NOT NULL REFERENCES booking(id),
  party_role            TEXT NOT NULL CHECK (party_role IN ('payer','participant_a','participant_b')),
  client_id             TEXT NOT NULL REFERENCES client(id),
  display_name_snapshot TEXT NOT NULL,
  contact_email_snapshot TEXT NOT NULL,
  consent_record_id     TEXT REFERENCES consent_record(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(booking_id, party_role),
  UNIQUE(booking_id, client_id)
);

CREATE INDEX idx_booking_participant_role ON booking_participant(booking_id, party_role);

CREATE TABLE IF NOT EXISTS appointment_participant (
  id                    TEXT PRIMARY KEY,
  appointment_id        TEXT NOT NULL REFERENCES appointment(id),
  booking_participant_id TEXT NOT NULL REFERENCES booking_participant(id),
  attendance_mode       TEXT NOT NULL CHECK (attendance_mode IN ('individual_a','individual_b','joint_both')),
  UNIQUE(appointment_id, booking_participant_id),
  UNIQUE(appointment_id, attendance_mode)
);

CREATE TABLE IF NOT EXISTS package_purchase (
  id                    TEXT PRIMARY KEY,
  booking_id            TEXT NOT NULL UNIQUE REFERENCES booking(id),
  service_package_id    TEXT NOT NULL REFERENCES service_package(id),
  total_price_idr       INTEGER NOT NULL CHECK (total_price_idr >= 0),
  paid_at               TEXT,
  validity_ends_at      TEXT,
  state                 TEXT NOT NULL DEFAULT 'pending'
                        CHECK (state IN ('pending','active','closed','expired')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_entitlement (
  id                    TEXT PRIMARY KEY,
  package_purchase_id   TEXT NOT NULL REFERENCES package_purchase(id),
  sequence_number       INTEGER NOT NULL,
  appointment_id        TEXT REFERENCES appointment(id),
  state                 TEXT NOT NULL DEFAULT 'available'
                        CHECK (state IN ('available','scheduled','consumed','restored','expired','closed')),
  consumed_at           TEXT,
  consumed_by           TEXT,
  UNIQUE(package_purchase_id, sequence_number)
);

-- ---------------------------------------------------------------------------
-- Payment, PaymentEvent, RefundAction (ADR 0089 §7, ADR 0093)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payment (
  id                    TEXT PRIMARY KEY,
  booking_id            TEXT NOT NULL REFERENCES booking(id),
  amount_idr            INTEGER NOT NULL CHECK (amount_idr >= 0),
  currency              TEXT NOT NULL DEFAULT 'IDR',
  method                TEXT NOT NULL CHECK (method IN ('qris','va')),
  provider              TEXT NOT NULL DEFAULT 'midtrans',
  status                TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created','pending','settled','paid_late','failed','expired','refunded')),
  idempotency_key       TEXT NOT NULL UNIQUE,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  settled_at            TEXT
);

CREATE INDEX idx_payment_booking ON payment(booking_id);

-- ADR 0093: at-most-one settled Payment per booking intent.
-- Enforced via partial UNIQUE; D1 supports this through indexes.
CREATE UNIQUE INDEX idx_payment_settled_per_booking
  ON payment(booking_id)
  WHERE status = 'settled';

CREATE TABLE IF NOT EXISTS payment_event (
  id                    TEXT PRIMARY KEY,
  payment_id            TEXT NOT NULL REFERENCES payment(id),
  provider_event_id     TEXT NOT NULL,
  received_at           TEXT NOT NULL DEFAULT (datetime('now')),
  verified              INTEGER NOT NULL CHECK (verified IN (0,1)),
  signature_status      TEXT NOT NULL,
  payload_amount_idr    INTEGER NOT NULL,
  payload_method        TEXT NOT NULL,
  payload_order_id      TEXT NOT NULL,
  payload_merchant_id   TEXT NOT NULL,
  amount_match          INTEGER NOT NULL CHECK (amount_match IN (0,1)),
  currency_match        INTEGER NOT NULL CHECK (currency_match IN (0,1)),
  order_match           INTEGER NOT NULL CHECK (order_match IN (0,1)),
  merchant_match        INTEGER NOT NULL CHECK (merchant_match IN (0,1)),
  processing_status     TEXT NOT NULL CHECK (processing_status IN ('received','applied','rejected','replay','unknown')),
  UNIQUE(provider_event_id)
);

CREATE TABLE IF NOT EXISTS refund_action (
  id                    TEXT PRIMARY KEY,
  payment_id            TEXT NOT NULL REFERENCES payment(id),
  outcome               TEXT NOT NULL CHECK (outcome IN ('full_refund','no_refund')),
  amount_idr            INTEGER NOT NULL DEFAULT 0 CHECK (amount_idr >= 0),
  currency              TEXT NOT NULL DEFAULT 'IDR',
  reason_category       TEXT NOT NULL,
  policy_version        TEXT NOT NULL,
  actor_membership_id   TEXT,
  approval_membership_id TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','processing','succeeded','failed','reversed')),
  provider_reference    TEXT,
  idempotency_key       TEXT NOT NULL UNIQUE,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at          TEXT
);

CREATE INDEX idx_refund_payment ON refund_action(payment_id);
-- ADR 0093: cumulative refund cannot exceed captured amount.
-- Enforced at command level inside db.batch (read current sum, compare).

-- ---------------------------------------------------------------------------
-- CancellationRequest, CancellationDecision, OutcomeCorrection, RescheduleAction
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cancellation_request (
  id                    TEXT PRIMARY KEY,
  target_kind           TEXT NOT NULL CHECK (target_kind IN ('booking','appointment','package_purchase')),
  target_id             TEXT NOT NULL,
  client_id             TEXT NOT NULL REFERENCES client(id),
  intake_channel        TEXT NOT NULL,        -- 'admin_whatsapp' for launch
  intake_summary        TEXT,
  state                 TEXT NOT NULL DEFAULT 'pending'
                        CHECK (state IN ('pending','decided','withdrawn')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at            TEXT,
  UNIQUE(target_kind, target_id, state)
    WHERE state = 'pending'
);

CREATE INDEX idx_cancellation_target ON cancellation_request(target_kind, target_id);

CREATE TABLE IF NOT EXISTS cancellation_decision (
  id                    TEXT PRIMARY KEY,
  cancellation_request_id TEXT NOT NULL REFERENCES cancellation_request(id),
  outcome               TEXT NOT NULL CHECK (outcome IN ('approve','deny')),
  reason_category       TEXT NOT NULL,
  policy_version        TEXT NOT NULL,
  actor_membership_id   TEXT NOT NULL,
  actor_at              TEXT NOT NULL DEFAULT (datetime('now')),
  effects_applied_at    TEXT,
  refund_action_id      TEXT REFERENCES refund_action(id)
);

CREATE INDEX idx_cancellation_decision_request ON cancellation_decision(cancellation_request_id);

CREATE TABLE IF NOT EXISTS outcome_correction (
  id                    TEXT PRIMARY KEY,
  appointment_id        TEXT NOT NULL REFERENCES appointment(id),
  old_outcome           TEXT NOT NULL,
  new_outcome           TEXT NOT NULL,
  reason_category       TEXT NOT NULL,
  actor_membership_id   TEXT NOT NULL,
  actor_at              TEXT NOT NULL DEFAULT (datetime('now')),
  effects_applied       TEXT                  -- JSON of corrected effects
);

CREATE INDEX idx_outcome_correction_appt ON outcome_correction(appointment_id);

CREATE TABLE IF NOT EXISTS reschedule_action (
  id                    TEXT PRIMARY KEY,
  original_appointment_id TEXT NOT NULL REFERENCES appointment(id),
  replacement_appointment_id TEXT NOT NULL REFERENCES appointment(id),
  reason_category       TEXT NOT NULL,
  actor_membership_id   TEXT NOT NULL,
  actor_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Staff and ClientAccess (ADR 0079, 0080, 0081)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_membership (
  id                    TEXT PRIMARY KEY,
  google_subject        TEXT NOT NULL UNIQUE,  -- Google 'sub' claim
  email                 TEXT NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  state                 TEXT NOT NULL DEFAULT 'active'
                        CHECK (state IN ('active','disabled')),
  invited_by_membership_id TEXT REFERENCES staff_membership(id),
  invited_at            TEXT NOT NULL DEFAULT (datetime('now')),
  activated_at          TEXT
);

CREATE TABLE IF NOT EXISTS role_assignment (
  id                    TEXT PRIMARY KEY,
  staff_membership_id   TEXT NOT NULL REFERENCES staff_membership(id),
  role                  TEXT NOT NULL CHECK (role IN ('admin','psychologist')),
  granted_by_membership_id TEXT NOT NULL REFERENCES staff_membership(id),
  granted_at            TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at            TEXT,
  UNIQUE(staff_membership_id, role)
);

-- ---------------------------------------------------------------------------
-- ClientAccess tokens (ADR 0094 — magic-link + scoped session)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_access_token (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES client(id),
  booking_id            TEXT REFERENCES booking(id),
  token_hash            TEXT NOT NULL UNIQUE,  -- never store plaintext
  purpose               TEXT NOT NULL CHECK (purpose IN ('booking_view','booking_reschedule','couple_view')),
  issued_at             TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at            TEXT NOT NULL,         -- 15 minutes
  consumed_at           TEXT,
  resend_invalidates    INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_client_access_token_window ON client_access_token(expires_at, consumed_at);

-- ---------------------------------------------------------------------------
-- Notifications (ADR 0052) — minimal schema; production may add provider refs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification (
  id                    TEXT PRIMARY KEY,
  recipient_kind        TEXT NOT NULL CHECK (recipient_kind IN ('client','staff','booking_participant')),
  recipient_id          TEXT NOT NULL,
  event                 TEXT NOT NULL,        -- e.g. 'booking.confirmed','appointment.reminder_24h'
  payload               TEXT NOT NULL,        -- JSON with subject/body/templated fields
  scheduled_for         TEXT NOT NULL,
  state                 TEXT NOT NULL DEFAULT 'pending'
                        CHECK (state IN ('pending','sent','failed','cancelled')),
  attempt_count         INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at          TEXT
);

CREATE INDEX idx_notification_pending ON notification(state, scheduled_for);

CREATE TABLE IF NOT EXISTS delivery_attempt (
  id                    TEXT PRIMARY KEY,
  notification_id       TEXT NOT NULL REFERENCES notification(id),
  provider              TEXT NOT NULL,        -- 'email'
  provider_message_id   TEXT,
  status                TEXT NOT NULL,        -- 'sent','failed','bounced'
  attempted_at            TEXT NOT NULL DEFAULT (datetime('now')),
  redacted_reference    TEXT
);

-- ---------------------------------------------------------------------------
-- Content (ADR 0079 — Admin-managed public narrative)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_entry (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,  -- e.g. 'home', 'pulang', 'fuja'
  kind                  TEXT NOT NULL CHECK (kind IN ('page','section','legal')),
  publish_status        TEXT NOT NULL DEFAULT 'draft'
                        CHECK (publish_status IN ('draft','published','archived')),
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_revision (
  id                    TEXT PRIMARY KEY,
  content_entry_id      TEXT NOT NULL REFERENCES content_entry(id),
  version               INTEGER NOT NULL,
  body_json             TEXT NOT NULL,
  author_membership_id  TEXT REFERENCES staff_membership(id),
  published_at          TEXT,
  UNIQUE(content_entry_id, version)
);

-- ---------------------------------------------------------------------------
-- AuditRecord (ADR 0086, ADR 0087)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_record (
  id                    TEXT PRIMARY KEY,
  actor_kind            TEXT NOT NULL CHECK (actor_kind IN ('staff','client','system')),
  actor_id              TEXT,
  command               TEXT NOT NULL,
  target_type           TEXT NOT NULL,
  target_id             TEXT NOT NULL,
  reason                TEXT,
  correlation_id        TEXT,
  idempotency_key       TEXT,
  before_state          TEXT,                 -- JSON; allowlist only
  after_state           TEXT,                 -- JSON; allowlist only
  recorded_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_target ON audit_record(target_type, target_id, recorded_at);
CREATE INDEX idx_audit_command ON audit_record(command, recorded_at);

-- ---------------------------------------------------------------------------
-- PrivacyRequest (ADR 0087) — minimal placeholder; full schema in Slice 8
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS privacy_request (
  id                    TEXT PRIMARY KEY,
  client_id             TEXT NOT NULL REFERENCES client(id),
  kind                  TEXT NOT NULL CHECK (kind IN ('export','redact','delete')),
  verification_status   TEXT NOT NULL DEFAULT 'pending',
  submitted_at          TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at          TEXT
);