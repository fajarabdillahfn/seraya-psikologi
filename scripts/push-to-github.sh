#!/usr/bin/env bash
# scripts/push-to-github.sh — push this repo to GitHub.
#
# Usage:
#   GH_TOKEN=<github_personal_access_token> ./scripts/push-to-github.sh
#   ./scripts/push-to-github.sh <github_personal_access_token>
#   ./scripts/push-to-github.sh --ssh
#
# This script will:
#   1. Create the GitHub repo `seraya-psikologi` under your account.
#   2. Push the local repo to `main`.
#   3. Print the public URL.
#
# Requires: git, curl, jq (for the HTTPS path).

set -euo pipefail

REPO_NAME="seraya-psikologi"
DESCRIPTION="Seraya Psikologi booking and payment MVP — Cloudflare Worker + D1"
PRIVATE=false

cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--ssh" ]]; then
  echo "==> SSH mode"
  echo "    Make sure ~/.ssh/github (or another key) is added to https://github.com/settings/keys"
  echo "    and that the SSH host key for github.com is trusted."
  if ! git remote get-url origin 2>/dev/null; then
    git remote add origin "git@github.com:fajarabdillahfn/${REPO_NAME}.git"
  fi
  echo "==> Pushing to git@github.com:fajarabdillahfn/${REPO_NAME}.git"
  git push -u origin main
  echo "==> Done. View at https://github.com/fajarabdillahfn/${REPO_NAME}"
  exit 0
fi

if [[ "${1:-}" == "--create-only" ]]; then
  TOKEN="${GH_TOKEN:-${2:-}}"
  if [[ -z "$TOKEN" ]]; then
    echo "ERROR: set GH_TOKEN env or pass as argument"
    exit 1
  fi
  echo "==> Creating GitHub repo ${REPO_NAME} via API"
  curl -sS -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/user/repos" \
    -d "{\"name\":\"${REPO_NAME}\",\"description\":\"${DESCRIPTION}\",\"private\":${PRIVATE}}"
  echo ""
  echo "==> Done. Push with:"
  echo "    GH_TOKEN=$TOKEN ./scripts/push-to-github.sh"
  exit 0
fi

TOKEN="${1:-${GH_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  cat <<EOF
Usage:
  GH_TOKEN=<github_pat> ./scripts/push-to-github.sh
  ./scripts/push-to-github.sh <github_pat>
  ./scripts/push-to-github.sh --ssh
  ./scripts/push-to-github.sh --create-only

Create a PAT at https://github.com/settings/tokens (classic, with 'repo' scope).
EOF
  exit 1
fi

USER=$(curl -sS -H "Authorization: token $TOKEN" https://api.github.com/user | jq -r .login)
echo "==> Authenticated as ${USER}"

echo "==> Creating repo (if missing)"
curl -sS -X POST -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user/repos" \
  -d "{\"name\":\"${REPO_NAME}\",\"description\":\"${DESCRIPTION}\",\"private\":${PRIVATE}}" \
  | jq -r '.html_url // empty' > /tmp/repo_url

REPO_URL="https://github.com/${USER}/${REPO_NAME}.git"
echo "==> Setting remote to ${REPO_URL}"
git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"

echo "==> Pushing to ${REPO_URL}"
GIT_TERMINAL_PROMPT=0 git -c credential.helper="!f() { echo username=$USER; echo password=$TOKEN; }; f" \
  push -u origin main

echo "==> Done. View at https://github.com/${USER}/${REPO_NAME}"
