#!/usr/bin/env bash
# scripts/seed-d1.sh — minimal seed for local/remote demo.
#
# Seeds:
#   - 1 Psychologist (Fuja Rahayu Kinanti)
#   - 2 Service offerings (Individual online, Individual offline)
#   - 1 AvailabilityRule (Tue 09:00-17:00)
#   - 14-day rolling slots
#   - 1 admin staff membership (placeholder)
#
# Usage:
#   ./scripts/seed-d1.sh local   # seed local D1
#   ./scripts/seed-d1.sh remote  # seed remote D1

set -euo pipefail
TARGET="${1:-remote}"

if [ "$TARGET" = "local" ]; then
  WRANGLER="npx wrangler d1 execute DB --local"
elif [ "$TARGET" = "remote" ]; then
  WRANGLER="npx wrangler d1 execute DB --remote --config wrangler.toml"
else
  echo "Usage: $0 [local|remote]"
  exit 1
fi

cd /home/jar/output/seraya-psikologi-mvp

SEED_SQL=$(cat <<'EOF'
-- Psychologist
INSERT OR IGNORE INTO psychologist
  (id, display_name, license_str, license_silp, credential_status, bio, expertise, education, publish_status)
VALUES
  ('fuja', 'Fuja Rahayu Kinanti, S.Psi., Psikolog', '[REDACTED]', '[REDACTED]', 'verified',
   'Pendekatan hangat, empatik, dan bebas penghakiman. Berpengalaman lebih dari 50 sesi konseling.',
   'Kecemasan dan overthinking|Pengembangan diri|Pengelolaan emosi dan stres|Relasi interpersonal|Kepercayaan diri',
   'S1 Psikologi UGM 2015|Profesi Psikolog UMM 2026',
   'published');

-- Service
INSERT OR IGNORE INTO service (id, program_pillar, display_name, description)
VALUES
  ('s_pulang', 'pulang', 'SERAYA PULANG', 'Konseling psikologi');

-- Service Offering (Individual Online)
INSERT OR IGNORE INTO service_offering
  (id, service_id, psychologist_id, mode, duration_minutes, transition_buffer_min, audience, active)
VALUES
  ('so_individual_online', 's_pulang', 'fuja', 'online', 60, 15, 'individual', 1);

-- Service Offering (Individual Offline)
INSERT OR IGNORE INTO service_offering
  (id, service_id, psychologist_id, mode, duration_minutes, transition_buffer_min, audience, active)
VALUES
  ('so_individual_offline', 's_pulang', 'fuja', 'offline', 60, 15, 'individual', 1);

-- Service Offering Revision (current published prices)
INSERT OR IGNORE INTO service_offering_revision
  (id, offering_id, version, price_idr, duration_minutes, transition_buffer_min, policy_version, effective_at)
VALUES
  ('rev_online_v1', 'so_individual_online', 1, 125000, 60, 15, 'v1-2026-08-31', datetime('now')),
  ('rev_offline_v1', 'so_individual_offline', 1, 200000, 60, 15, 'v1-2026-08-31', datetime('now'));

-- Availability rule: Tue (2) 09:00-17:00
INSERT OR IGNORE INTO availability_rule
  (id, psychologist_id, weekday, starts_at_local, ends_at_local, effective_from)
VALUES
  ('rule_fuja_tue', 'fuja', 2, '09:00', '17:00', '2026-08-31');

-- Admin staff (placeholder for MVP dev)
INSERT OR IGNORE INTO staff_membership
  (id, google_subject, email, display_name, state, activated_at)
VALUES
  ('admin_placeholder', 'placeholder@example.com', 'admin@seraya.local', 'Admin Placeholder', 'active', datetime('now'));
EOF
)

echo "$SEED_SQL" > /tmp/seed_basic.sql
$WRANGLER --file /tmp/seed_basic.sql 2>&1 | tail -3

# Generate slots for next 14 days (Tue only since rule is Tue)
SLOT_SQL=$(python3 <<'PYEOF'
from datetime import datetime, timedelta, timezone
import uuid

now = datetime.now(timezone.utc)
slots = []
for day_offset in range(14):
    target_date = now + timedelta(days=day_offset)
    if target_date.weekday() != 2:  # Tuesday only
        continue
    for hour_utc in range(2, 10):  # 09:00-17:00 WIB = 02:00-10:00 UTC
        starts = target_date.replace(hour=hour_utc, minute=0, second=0, microsecond=0)
        ends = starts + timedelta(hours=1)
        for offering_id in ('so_individual_online', 'so_individual_offline'):
            slot_id = str(uuid.uuid4())
            slots.append(f"INSERT OR IGNORE INTO availability_slot (id, psychologist_id, offering_id, starts_at_utc, ends_at_utc) VALUES ('{slot_id}', 'fuja', '{offering_id}', '{starts.isoformat().replace('+00:00','Z')}', '{ends.isoformat().replace('+00:00','Z')}');")
print('\n'.join(slots))
PYEOF
)

echo "$SLOT_SQL" > /tmp/seed_slots.sql
$WRANGLER --file /tmp/seed_slots.sql 2>&1 | tail -3

echo ""
echo "=== Summary ==="
$WRANGLER --command "SELECT 'psychologist' AS tbl, COUNT(*) FROM psychologist UNION ALL SELECT 'service', COUNT(*) FROM service UNION ALL SELECT 'offering', COUNT(*) FROM service_offering UNION ALL SELECT 'slot', COUNT(*) FROM availability_slot UNION ALL SELECT 'staff', COUNT(*) FROM staff_membership;"
