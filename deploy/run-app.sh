#!/usr/bin/env bash
# Постоянная раздача собранного фронта (fallback, если nginx не отдаёт dist напрямую).
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${PROJECT_ROOT}/.nvm"
# shellcheck disable=SC1091
source "${NVM_DIR}/nvm.sh"
cd "${PROJECT_ROOT}/app"
test -d dist || { echo "Нет app/dist — сначала deploy/bootstrap-project.sh"; exit 1; }
exec npx --yes serve@14.2.4 -s dist -l tcp://127.0.0.1:4173 --no-port-switching
