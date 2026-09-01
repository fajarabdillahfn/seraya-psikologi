#!/usr/bin/env bash
# scripts/push-to-github.sh — auto-create GitHub repo and push.
#
# This script uses the SSH key at ~/.ssh/github which is already authorized
# for the fajarabdillahfn account. It calls the GitHub API to create the
# repo, then uses git+SSH to push.
#
# Requires:
#   - SSH key in ssh-agent (ssh-add ~/.ssh/github)
#   - One of:
#     (a) GH_TOKEN env var with `repo` scope, OR
#     (b) you run `gh auth login` first
#
# Usage:
#   GH_TOKEN=ghp_*** ./scripts/push-to-github.sh
#   ./scripts/push-to-github.sh    # uses GH_TOKEN or asks gh

set -euo pipefail
REPO="seraya-psikologi"
DESC="Seraya Psikologi booking and payment MVP — Cloudflare Worker + D1"
PRIVATE="${PRIVATE:-false}"

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  echo " No git repo here."
  exit 1
fi

# Make sure ssh-agent has the github key
if ! ssh-add -l 2>/dev/null | grep -q "github"; then
  echo " Loading ~/.ssh/github into ssh-agent..."
  eval $(ssh-agent -s) >/dev/null
  ssh-add ~/.ssh/github
fi

# Get/create token
TOKEN="${GH_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    TOKEN=$(gh auth token)
  fi
fi

if [ -z "$TOKEN" ]; then
  echo ""
  echo "Need a GitHub token. Options:"
  echo "  1) GH_TOKEN=ghp_*** ./scripts/push-to-github.sh"
  echo "  2) gh auth login (then rerun this script)"
  echo "  3) Create the repo manually at https://github.com/new then push:"
  echo "     git -C $(pwd) remote set-url origin git@github.com:fajarabdillahfn/${REPO}.git"
  echo "     git -C $(pwd) push -u origin main"
  exit 1
fi

# Check if repo exists
if curl -s -H "Authorization: token $TOKEN"     "https://api.github.com/repos/fajarabdillahfn/${REPO}"     | grep -q '"id"'; then
  echo " Repo fajarabdillahfn/${REPO} already exists, skipping create."
else
  echo " Creating repo fajarabdillahfn/${REPO}..."
  curl -s -X POST -H "Authorization: token $TOKEN"        -H "Accept: application/vnd.github+json"        "https://api.github.com/user/repos"        -d "{\"name\":\"${REPO}\",\"description\":\"${DESC}\",\"private\":${PRIVATE}}"     | grep -E '"(html_url|full_name|message)"' | head -3
fi

# Push via SSH
git remote set-url origin "git@github.com:fajarabdillahfn/${REPO}.git"
echo " Pushing to git@github.com:fajarabdillahfn/${REPO}.git"
git push -u origin main
echo " Done. Visit https://github.com/fajarabdillahfn/${REPO}"
