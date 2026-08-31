#!/usr/bin/env bash
# scripts/deploy-docs-to-pages.sh — deploy docs-site/ to Cloudflare Pages.
#
# Usage:
#   ./scripts/deploy-docs-to-pages.sh [project-name]
#
# Default project: seraya-psikologi-docs
#
# Requires: npx wrangler (already in mvp/node_modules).

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${1:-seraya-psikologi-docs}"

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found. Install Node 20+."
  exit 1
fi

echo "==> Building docs-site (already pre-built at docs-site/)"
[[ -d docs-site ]] || { echo "ERROR: docs-site/ not found."; exit 1; }

echo "==> Authenticating with Cloudflare (will open browser if OAuth is interactive)"
# If running interactively, `wrangler login` will open a browser.
# If headless, you must set CLOUDFLARE_API_TOKEN first.
npx --prefix=/home/jar/output/psychology-research/cloudflare-prd wrangler pages deploy docs-site \
  --project-name "${PROJECT}" \
  --branch main \
  --commit-dirty=true

echo "==> Done. URL: https://${PROJECT}.pages.dev"
