#!/usr/bin/env bash
# Builds the frontend from the lockfile and switches the live site atomically.
# Needs no root. Roll back: ln -sfn releases/<previous> ~/vow-site/current.tmp && mv -T ~/vow-site/current.tmp ~/vow-site/current
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$HOME/vow-site"
REL="$(date -u +%Y%m%d-%H%M%S)"
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
npx vite build
mkdir -p "$SITE/releases"
cp -r dist "$SITE/releases/$REL"
chmod -R a+rX "$SITE"
ln -sfn "releases/$REL" "$SITE/current.tmp"
mv -T "$SITE/current.tmp" "$SITE/current"
ls -1dt "$SITE"/releases/* | tail -n +6 | xargs -r rm -rf
echo "Published release $REL"
