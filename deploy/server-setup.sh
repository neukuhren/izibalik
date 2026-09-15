#!/usr/bin/env bash
# Однократная подготовка хоста для нескольких проектов в /opt/projects/<имя>.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git nginx certbot python3-certbot-nginx python3-venv python3-pip curl ca-certificates

mkdir -p /opt/projects
systemctl enable nginx
systemctl start nginx

echo "Базовые пакеты установлены. Каталог проектов: /opt/projects"
