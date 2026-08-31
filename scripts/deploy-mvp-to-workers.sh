#!/usr/bin/env bash
# scripts/deploy-mvp-to-workers.sh — deploy the MVP Worker to Cloudflare Workers.
#
# Usage:
#   ./scripts/deploy-mvp-to-workers.sh
#
# Requires:
#   - Cloudflare account (https://dash.cloudflare.com)
#   - npx wrangler authenticated (run `wrangler login` first)
#   - A real D1 database (created with `wrangler d1 create`)

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found. Install Node 20+."
  exit 1
fi

if [[ ! -f mvp/wrangler.toml ]]; then
  echo "ERROR: mvp/wrangler.toml not found."
  exit 1
fi

echo "==> Authenticating with Cloudflare"
npx --prefix=/home/jar/output/psychology-research/cloudflare-prd wrangler login || true

echo "==> Creating D1 database (if not already created)"
D1_OUT=$(npx --prefix=/home/jar/output/psychology-research/cloudflare-prd wrangler d1 create seraya-db 2>&1 | tee /tmp/d1_create.log || true)
echo "${D1_OUT}"
DB_ID=$(echo "${D1_OUT}" | grep -oE "[a-f0-9-]{36}" | head -1 || true)
if [[ -z "${DB_ID}" ]]; then
  echo "WARN: could not auto-extract database_id. Edit mvp/wrangler.toml manually."
else
  echo "==> Setting database_id = ${DB_ID}"
  sed -i "s/database_id = \"PLACEHOLDER_DB_ID\"/database_id = \"${DB_ID}\"/" mvp/wrangler.toml
fi

echo "==> Applying migrations to remote"
npx --prefix=/home/jar/output/psychology-research/cloudflare-prd wrangler d1 migrations apply seraya-db --remote --dir mvp/migrations

echo "==> Deploying Worker"
npx --prefix=/home/jar/output/psychology-research/cloudflare-prd wrangler deploy --config mvp/wrangler.toml

echo "==> Done. URL will be shown above (e.g. https://seraya-psikologi.<account>.workers.dev)"
