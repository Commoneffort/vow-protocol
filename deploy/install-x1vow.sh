#!/usr/bin/env bash
# Installs the x1vow.xyz nginx site and TLS certificate. Safe to re-run.
# Touches only x1vow files; restores them if the nginx config test fails.
#   sudo bash deploy/install-x1vow.sh
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo."; exit 1; }
DIR="$(cd "$(dirname "$0")" && pwd)"
IP=193.34.212.186
AV=/etc/nginx/sites-available/x1vow.xyz
EN=/etc/nginx/sites-enabled/x1vow.xyz
CERT=/etc/letsencrypt/live/x1vow.xyz/fullchain.pem

[[ -f /home/owlx1/vow-site/current/index.html ]] || { echo "Site not published. Run deploy/publish-frontend.sh first."; exit 1; }

BACKUP="$(mktemp -d)"
for f in "$AV" /etc/nginx/snippets/x1vow-security.conf /etc/nginx/snippets/x1vow-site.conf; do
  [[ -e "$f" ]] && cp -a "$f" "$BACKUP/"
done
HAD_LINK=0; [[ -L "$EN" ]] && HAD_LINK=1

apply() {
  install -m 644 "$DIR/nginx/x1vow-security.conf" /etc/nginx/snippets/x1vow-security.conf
  install -m 644 "$DIR/nginx/x1vow-site.conf" /etc/nginx/snippets/x1vow-site.conf
  install -m 644 "$1" "$AV"
  ln -sfn "$AV" "$EN"
  if ! nginx -t; then
    echo "nginx config test failed. Restoring previous x1vow files."
    rm -f "$AV" /etc/nginx/snippets/x1vow-security.conf /etc/nginx/snippets/x1vow-site.conf
    [[ -e "$BACKUP/x1vow.xyz" ]] && cp -a "$BACKUP/x1vow.xyz" "$AV"
    [[ -e "$BACKUP/x1vow-security.conf" ]] && cp -a "$BACKUP/x1vow-security.conf" /etc/nginx/snippets/
    [[ -e "$BACKUP/x1vow-site.conf" ]] && cp -a "$BACKUP/x1vow-site.conf" /etc/nginx/snippets/
    [[ $HAD_LINK -eq 1 ]] || rm -f "$EN"
    exit 1
  fi
  systemctl reload nginx
}

mkdir -p /var/www/letsencrypt
if [[ ! -f "$CERT" ]]; then
  apply "$DIR/nginx/x1vow.xyz.http.conf"
  for h in x1vow.xyz www.x1vow.xyz; do
    if ! getent ahostsv4 "$h" | awk '{print $1}' | grep -qx "$IP"; then
      echo "Stage 1 installed. $h does not resolve to $IP yet."
      echo "Add A records for x1vow.xyz and www.x1vow.xyz, then re-run this script."
      exit 0
    fi
  done
  certbot certonly --webroot -w /var/www/letsencrypt -d x1vow.xyz -d www.x1vow.xyz \
    --non-interactive --agree-tos --keep-until-expiring \
    --deploy-hook "systemctl reload nginx"
fi
apply "$DIR/nginx/x1vow.xyz.conf"
echo "x1vow.xyz is live over HTTPS."
