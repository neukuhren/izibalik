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

# Снимок цен Fazer для сверки с поддержкой (нужен FAZER_API_KEY в backend/.env)
if [[ -f backend/.env ]] && grep -q '^FAZER_API_KEY=.\+' backend/.env 2>/dev/null; then
  (cd backend && npm run job:pricing-snapshot) || echo "WARN: pricing-snapshot не создан"
fi

install -D -m 644 deploy/nginx/izibalik.conf /etc/nginx/sites-available/izibalik
ln -sf /etc/nginx/sites-available/izibalik /etc/nginx/sites-enabled/izibalik
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Шаблон nginx в git — только HTTP. Если сертификат izibalik.shop уже есть, certbot снова включает 443.
SSL_DOMAIN="${IZIBALIK_SSL_DOMAIN:-izibalik.shop}"
if [[ -d "/etc/letsencrypt/live/${SSL_DOMAIN}" ]]; then
  certbot --nginx -d "${SSL_DOMAIN}" -d "www.${SSL_DOMAIN}" --non-interactive --redirect || true
elif [[ ! -d /etc/letsencrypt/live/$DOMAIN ]]; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
fi

systemctl reload nginx
systemctl restart izibalik-api || true
echo "Деплой завершён: https://${SSL_DOMAIN}/"
