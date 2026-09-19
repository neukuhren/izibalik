#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export HOME="${HOME:-/root}"
export NVM_DIR="${PROJECT_ROOT}/.nvm"
# shellcheck disable=SC1091
source "${NVM_DIR}/nvm.sh"
cd "${PROJECT_ROOT}/backend"
test -f dist/jobs/refresh-paid-orders.js || {
  echo "Нет dist/jobs/refresh-paid-orders.js — npm run build в backend"
  exit 1
}
exec node dist/jobs/refresh-paid-orders.js
