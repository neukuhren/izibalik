#!/usr/bin/env bash
# LAVA Business (lava.ru): https://developer.lava.ru/
# LAVA_SECRET_KEY — секретный ключ API (подпись запросов), НЕ «выплатной» ключ вывода.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

SHOP="${LAVA_SHOP_ID:-}"
SECRET="${LAVA_SECRET_KEY:-}"
WEBHOOK_SECRET="${LAVA_WEBHOOK_SECRET:-}"

if [[ -z "$SHOP" || -z "$SECRET" || -z "$WEBHOOK_SECRET" ]]; then
  echo "Задайте LAVA_SHOP_ID, LAVA_SECRET_KEY, LAVA_WEBHOOK_SECRET"
  exit 1
fi

[[ -f "$ENV_FILE" ]] || { echo "Нет $ENV_FILE"; exit 1; }

set_kv() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV_FILE"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENV_FILE"
  else
    echo "${k}=${v}" >> "$ENV_FILE"
  fi
}

set_kv PAYMENT_PROVIDER lava
set_kv PUBLIC_URL https://izibalik.shop
set_kv LAVA_SHOP_ID "$SHOP"
set_kv LAVA_SECRET_KEY "$SECRET"
set_kv LAVA_WEBHOOK_SECRET "$WEBHOOK_SECRET"
set_kv LAVA_WEBHOOK_PATH /api/webhooks/lava
set_kv LAVA_API_BASE https://api.lava.ru
set_kv LAVATOP_API_KEY ""
set_kv LAVATOP_WEBHOOK_IPS "-"

chmod 600 "$ENV_FILE"
echo "OK: LAVA Business настроена (PAYMENT_PROVIDER=lava)."
