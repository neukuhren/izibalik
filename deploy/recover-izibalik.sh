#!/usr/bin/env bash
# Быстрое восстановление после reboot / остановки nginx+API.
set -euo pipefail
PROJECT_DIR="/opt/projects/izibalik"
cd "$PROJECT_DIR"

if [[ -x deploy/install-systemd.sh ]]; then
  ./deploy/install-systemd.sh
fi

systemctl reset-failed izibalik-build.service izibalik-api.service 2>/dev/null || true
systemctl enable nginx izibalik-build.service izibalik-api.service

systemctl start nginx
systemctl start izibalik-build.service || true
systemctl start izibalik-api.service

SSL_DOMAIN="${IZIBALIK_SSL_DOMAIN:-izibalik.shop}"
if [[ -d "/etc/letsencrypt/live/${SSL_DOMAIN}" ]]; then
  certbot --nginx -d "${SSL_DOMAIN}" -d "www.${SSL_DOMAIN}" --non-interactive --redirect || true
  systemctl reload nginx
fi

echo -n "nginx: "; systemctl is-active nginx
echo -n "api: "; systemctl is-active izibalik-api
curl -sf -m 5 "http://127.0.0.1:8787/api/catalog" | head -c 120 || echo "API не отвечает"
echo
