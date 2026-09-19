# IZIBALIK — Backend

API + Telegram-бот + выдача UC через FazerCards для магазина IZIBALIK (PUBG UC / New State NC).
Node 22+ (используется встроенный `node:sqlite`, без нативных зависимостей).

## Возможности

- REST API под существующий фронт (`app/`): конфиг, заказы, оплата, статусы, баланс поставщика, рассылки.
- Проверка подписи Telegram `initData` на каждом запросе.
- Гейт админки по списку Telegram ID (`ADMIN_IDS`).
- Выдача заказов через FazerCards (`/topups/order`, идемпотентность по `orderId`).
- Telegram-бот (`grammy`, long polling): `/start` → кнопка запуска Mini App, уведомления о заказах, рассылки.
- Платёжка вынесена в адаптер (`src/payments.ts`). Сейчас активна **заглушка** — подключите провайдера позже.

## Быстрый старт

```bash
cd backend
npm install
cp .env.example .env      # заполнить BOT_TOKEN, FAZER_API_KEY, ADMIN_IDS, MINIAPP_URL, PUBLIC_URL
npm run dev               # разработка (tsx watch)
# или прод:
npm run build && npm start
```

## Переменные окружения

См. `.env.example`. Ключевые:

| Переменная | Назначение |
|---|---|
| `BOT_TOKEN` | токен бота `@izibalikbot` |
| `MINIAPP_URL` | URL Mini App для кнопки `/start` |
| `ADMIN_IDS` | Telegram ID админов через запятую |
| `FAZER_API_KEY` | ключ FazerCards |
| `PUBLIC_URL` | публичный URL бэкенда (redirect/webhook оплаты) |
| `PAYMENT_PROVIDER` | `stub` (заглушка) / место для реального провайдера |
| `SERVE_DIST` | путь к собранному фронту (`../app/dist`), пусто = только API |
| `DB_PATH` | файл SQLite |

## API (контракт фронта)

| Метод | Путь | Доступ | Назначение |
|---|---|---|---|
| GET | `/api/config` | все | наценки/активность/промо |
| POST | `/api/config` | админ | сохранить конфиг |
| GET | `/api/balance` | все | баланс поставщика + курс |
| POST | `/api/seen` | юзер | регистрация для рассылок |
| POST | `/api/my-orders` | юзер | заказы пользователя |
| POST | `/api/orders` | админ | все заказы |
| POST | `/api/pay` | юзер | создать заказ/платёж → redirect |
| GET | `/api/order?id=` | все | статус заказа (опрос) |
| POST | `/api/topup` | админ | крипто-пополнение баланса поставщика |
| POST | `/api/broadcast/audiences` | админ | размеры аудиторий |
| POST | `/api/broadcast` | админ | старт рассылки |
| GET | `/api/broadcast/status` | все | статус рассылки |

Статусы заказа: `pending → paid → done` (или `failed` / `fulfill_failed`).

Фоновая синхронизация заказов в `paid` с Fazer (каждые 5 мин): systemd timer `izibalik-refresh-orders.timer`, скрипт `npm run job:refresh-paid` (см. `deploy/systemd/`).

## Подключить реальную платёжку

1. Реализовать `PaymentProvider` в `src/payments.ts` (метод `createPayment` → `{ redirect }`).
2. Вернуть его из `getProvider()` по `PAYMENT_PROVIDER`.
3. Добавить webhook-роут в `src/routes.ts`, который после подтверждения вызывает `markOrderPaid(orderId)`.

## Деплой (systemd + nginx)

```bash
# на сервере (Ubuntu, Node 22+)
git clone <repo> /opt/izibalik && cd /opt/izibalik
cd app && npm install && npm run build && cd ..     # соберёт app/dist
cd backend && npm install && npm run build
cp .env.example .env && nano .env                   # заполнить, SERVE_DIST=../app/dist
```

`/etc/systemd/system/izibalik.service`:

```ini
[Unit]
Description=IZIBALIK backend
After=network.target

[Service]
WorkingDirectory=/opt/izibalik/backend
ExecStart=/usr/bin/node dist/index.js
EnvironmentFile=/opt/izibalik/backend/.env
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now izibalik
```

nginx (проксирует всё на бэкенд, TLS через certbot):

```nginx
server {
  server_name izibalik.example;
  location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; }
}
```

Бэкенд сам раздаёт `app/dist` (при `SERVE_DIST`), поэтому nginx можно оставить простым прокси.
Для Telegram iframe добавьте заголовок `Content-Security-Policy: frame-ancestors https://web.telegram.org https://*.telegram.org;`.
