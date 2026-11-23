#!/usr/bin/env bash
# Builds the frontend from the lockfile and switches the live site atomically.
# After install-x1vow.sh the site belongs to the no-login vowdeploy account, so a
# release needs your sudo password. Roll back by repointing /var/www/x1vow/current.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REL="$(date -u +%Y%m%d-%H%M%S)"
cd "$ROOT/frontend"
npm ci --no-audit --no-fund
npx vite build

SITE=/var/www/x1vow
if [[ -d "$SITE/releases" ]]; then
  tar -C dist -cf - . | sudo -u vowdeploy sh -c "
    set -eu; umask 022
    mkdir '$SITE/releases/$REL'
    tar -C '$SITE/releases/$REL' -xf -
    ln -sfn 'releases/$REL' '$SITE/current.tmp'
    mv -T '$SITE/current.tmp' '$SITE/current'
    ls -1dt '$SITE'/releases/* | tail -n +6 | xargs -r rm -rf"
else
  # Before the first install-x1vow.sh run
  SITE="$HOME/vow-site"
  mkdir -p "$SITE/releases"
  cp -r dist "$SITE/releases/$REL"
  chmod -R a+rX "$SITE"
  ln -sfn "releases/$REL" "$SITE/current.tmp"
  mv -T "$SITE/current.tmp" "$SITE/current"
  ls -1dt "$SITE"/releases/* | tail -n +6 | xargs -r rm -rf
fi
echo "Published release $REL"
