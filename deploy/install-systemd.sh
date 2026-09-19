#!/usr/bin/env bash
set -euo pipefail
install -d -m 755 /etc/izibalik
if [[ ! -f /etc/izibalik/environment ]]; then
  install -m 600 /opt/projects/izibalik/deploy/environment.example /etc/izibalik/environment
  echo "Создан /etc/izibalik/environment — заполните секреты."
fi
chmod +x /opt/projects/izibalik/deploy/run-app.sh /opt/projects/izibalik/deploy/run-api.sh /opt/projects/izibalik/deploy/run-refresh-paid-orders.sh
install -m 644 /opt/projects/izibalik/deploy/systemd/izibalik-build.service /etc/systemd/system/
install -m 644 /opt/projects/izibalik/deploy/systemd/izibalik-web.service /etc/systemd/system/
install -m 644 /opt/projects/izibalik/deploy/systemd/izibalik-api.service /etc/systemd/system/
install -m 644 /opt/projects/izibalik/deploy/systemd/izibalik-refresh-orders.service /etc/systemd/system/
install -m 644 /opt/projects/izibalik/deploy/systemd/izibalik-refresh-orders.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable izibalik-build.service izibalik-web.service izibalik-api.service izibalik-refresh-orders.timer
systemctl start izibalik-refresh-orders.timer
systemctl restart izibalik-build.service
systemctl restart izibalik-web.service
systemctl restart izibalik-api.service
