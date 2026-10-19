#!/usr/bin/env bash
# Настройка Lava Top / PayUC в backend/.env на сервере.
# Использование (ключ не попадает в git):
#   LAVATOP_API_KEY='…' ./deploy/configure-lavatop-payuc.sh
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет $ENV_FILE — сначала deploy/setup-backend-env.sh"
  exit 1
fi

KEY="${LAVATOP_API_KEY:-}"
if [[ -z "$KEY" ]]; then
  echo "Задайте LAVATOP_API_KEY в окружении."
  exit 1
fi

set_kv() {
  local k="$1" v="$2"
  if grep -q "^${k}=" "$ENV_FILE"; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$ENV_FILE"
  else
    echo "${k}=${v}" >> "$ENV_FILE"
  fi
}

set_kv PAYMENT_PROVIDER lavatop
set_kv PUBLIC_URL https://izibalik.shop
set_kv LAVATOP_INIT_URL https://api.payuc.io/billing-api/init
set_kv LAVATOP_API_KEY "$KEY"
set_kv LAVATOP_WEBHOOK_IPS 87.232.67.91

chmod 600 "$ENV_FILE"
echo "OK: PayUC / Lava Top env обновлён (LAVATOP_API_KEY записан)."
