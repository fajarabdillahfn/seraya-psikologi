#!/usr/bin/env bash
# scripts/smoke-test.sh — quick smoke test for the MVP.
BASE="https://seraya-psikologi.aurinko-jar-ai.workers.dev"
DOCS="https://seraya-psikologi-docs.pages.dev"

echo "=== Docs site ==="
for path in / /adr/0089.html /adr/0096.html /baseline/prd-guideline-review/; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$DOCS$path")
  echo "  $code  $DOCS$path"
done

echo ""
echo "=== MVP Worker (public pages) ==="
for path in / /pulang /fuja /faq /safety/crisis /privacy /consent /cancellation /book /healthz; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "  $code  $BASE$path"
done

echo ""
echo "=== MVP Worker (admin/cancel — expect 401/410) ==="
for path in /admin /admin/bookings; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "$BASE$path")
  echo "  $code  $BASE$path (expect 401)"
done

code=$(curl -sL -X POST -o /dev/null -w "%{http_code}" "$BASE/api/booking/x/cancel")
echo "  $code  POST /api/booking/x/cancel (expect 410)"
code=$(curl -sL -X POST -o /dev/null -w "%{http_code}" "$BASE/api/booking/x/refund")
echo "  $code  POST /api/booking/x/refund (expect 410)"

code=$(curl -sL -X POST -o /dev/null -w "%{http_code}" "$BASE/api/payment/notification")
echo "  $code  POST /api/payment/notification (expect 503)"
