#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export HOME="${HOME:-/root}"
export NVM_DIR="${PROJECT_ROOT}/.nvm"
# shellcheck disable=SC1091
source "${NVM_DIR}/nvm.sh"
cd "${PROJECT_ROOT}/backend"
test -f dist/index.js || { echo "Нет backend/dist — запустите bootstrap-project.sh"; exit 1; }
exec node dist/index.js
