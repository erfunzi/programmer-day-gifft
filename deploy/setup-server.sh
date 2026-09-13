#!/usr/bin/env bash
set -euo pipefail

# Run on the server after cloning this repo.
# Usage: sudo bash deploy/setup-server.sh /opt/developer-card

ROOT_DIR="${1:-/opt/developer-card}"
SITE_NAME="developer.lyroo.space"
NGINX_AVAILABLE="/etc/nginx/sites-available/${SITE_NAME}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SITE_NAME}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/setup-server.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "nginx is required"
  exit 1
fi

mkdir -p "$ROOT_DIR"
cd "$ROOT_DIR"

docker compose up -d --build

cp "$(dirname "$0")/nginx-host.conf" "$NGINX_AVAILABLE"
ln -sfn "$NGINX_AVAILABLE" "$NGINX_ENABLED"

nginx -t
systemctl reload nginx

echo "OK: ${SITE_NAME} -> 127.0.0.1:8080"
echo "Point DNS A record of ${SITE_NAME} to this server, then:"
echo "  sudo certbot --nginx -d ${SITE_NAME}"
