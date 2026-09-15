#!/usr/bin/env bash
# Подготовка изолированного окружения проекта izibalik (Debian/Ubuntu).
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

NODE_VERSION="${IZIBALIK_NODE_VERSION:-22}"

if ! command -v python3 >/dev/null; then
  echo "python3 не найден. Установите: apt install python3 python3-venv python3-pip"
  exit 1
fi

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
if [[ -s deploy/requirements.txt ]]; then
  pip install -r deploy/requirements.txt
fi

export NVM_DIR="${PROJECT_ROOT}/.nvm"
mkdir -p "$NVM_DIR"
if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
# shellcheck disable=SC1091
source "${NVM_DIR}/nvm.sh"
# nvm use может вернуть 3 при set -e, если версия ещё не установлена; install переключает активную версию.
nvm install "$NODE_VERSION"

cd app
npm ci
npm run build

echo "Сборка готова: ${PROJECT_ROOT}/app/dist"
