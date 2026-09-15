#!/usr/bin/env bash
# Обновление кода и пересборка izibalik на сервере.
set -euo pipefail

PROJECT_DIR="/opt/projects/izibalik"
REPO_URL="${IZIBALIK_REPO_URL:-https://github.com/neukuhren/izibalik.git}"
BRANCH="${IZIBALIK_BRANCH:-master}"
DOMAIN="${IZIBALIK_DOMAIN:-vm1255887.hosted-by.u1host.com}"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

chmod +x deploy/bootstrap-project.sh deploy/server-setup.sh
./deploy/bootstrap-project.sh

install -D -m 644 deploy/nginx/izibalik.conf /etc/nginx/sites-available/izibalik
ln -sf /etc/nginx/sites-available/izibalik /etc/nginx/sites-enabled/izibalik
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if [[ ! -d /etc/letsencrypt/live/$DOMAIN ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect
fi

systemctl reload nginx
echo "Деплой завершён: https://${DOMAIN}/"
