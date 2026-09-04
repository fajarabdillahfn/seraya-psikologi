-- Generate launch slots for every canonical offering (5 psychologists x 3 modes).
-- Local operating window: 09:00-20:00 WIB, 60-minute sessions, 30-minute grid.
-- UTC conversion for Asia/Jakarta is local time minus 7 hours.

WITH RECURSIVE
  days(day) AS (
    SELECT date('now')
    UNION ALL
    SELECT date(day, '+1 day') FROM days WHERE day < date('now', '+90 day')
  ),
  starts(n) AS (
    SELECT 0
    UNION ALL
    SELECT n + 1 FROM starts WHERE n < 20
  )
INSERT INTO availability_slot (id, psychologist_id, offering_id, starts_at_utc, ends_at_utc, withdrawn)
SELECT
  'launch_' || so.id || '_' || replace(days.day, '-', '') || '_' || printf('%02d', 9 + (starts.n / 2)) || printf('%02d', (starts.n % 2) * 30),
  so.psychologist_id,
  so.id,
  datetime(days.day || ' 02:00:00', '+' || (starts.n * 30) || ' minutes'),
  datetime(days.day || ' 02:00:00', '+' || ((starts.n * 30) + 60) || ' minutes'),
  0
FROM service_offering so
CROSS JOIN days
CROSS JOIN starts
WHERE so.id LIKE 'off_%'
  AND so.active = 1
  AND so.audience = 'individual'
  AND starts.n < 22
  AND strftime('%w', days.day) BETWEEN '0' AND '6'
  AND NOT EXISTS (
    SELECT 1 FROM availability_slot existing
    WHERE existing.id = 'launch_' || so.id || '_' || replace(days.day, '-', '') || '_' || printf('%02d', 9 + (starts.n / 2)) || printf('%02d', (starts.n % 2) * 30)
  );

