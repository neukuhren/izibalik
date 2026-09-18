#!/usr/bin/env bash
# Создаёт backend/.env для продакшена (без секретов в git).
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/backend/.env"
EXAMPLE="${PROJECT_ROOT}/backend/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  echo "backend/.env уже существует — не перезаписываю."
  exit 0
fi

cp "$EXAMPLE" "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Подтянуть токен из legacy-файла, если есть
LEGACY="/etc/izibalik/environment"
if [[ -f "$LEGACY" ]]; then
  # shellcheck disable=SC1090
  source "$LEGACY" 2>/dev/null || true
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    sed -i "s|^BOT_TOKEN=.*|BOT_TOKEN=${TELEGRAM_BOT_TOKEN}|" "$ENV_FILE"
  fi
  if [[ -n "${FAZER_API_KEY:-}" ]]; then
    sed -i "s|^FAZER_API_KEY=.*|FAZER_API_KEY=${FAZER_API_KEY}|" "$ENV_FILE"
  fi
fi

cat >> "$ENV_FILE" << 'PATCH'

# --- prod overrides (deploy/setup-backend-env.sh) ---
PATCH

# Заменить прод-значения
sed -i \
  -e 's|^PORT=.*|PORT=8787|' \
  -e 's|^HOST=.*|HOST=127.0.0.1|' \
  -e 's|^SERVE_DIST=.*|SERVE_DIST=|' \
  -e 's|^MINIAPP_URL=.*|MINIAPP_URL=https://izibalik.shop/|' \
  -e 's|^PUBLIC_URL=.*|PUBLIC_URL=https://izibalik.shop|' \
  -e 's|^PAYMENT_PROVIDER=.*|PAYMENT_PROVIDER=stub|' \
  "$ENV_FILE"

echo "Создан ${ENV_FILE} — проверьте FAZER_API_KEY и платёжку."
