# IZIBALIK — PUBG UC

Telegram Mini App магазина PUBG UC / Prime / Elite Pass / New State NC с выдачей через FazerCards.

## Состав

- `app/` — фронтенд (Vite + React + TypeScript), Telegram Mini App
- `backend/` — API + Telegram-бот + выдача через FazerCards (Node 22+, `node:sqlite`)
- `tools/` — утилиты: сверка каталога FazerCards, сжатие артов
- `legal/` — оферта, политика, условия

## Запуск

```bash
cd app && npm install && npm run build
cd ../backend && npm install && cp .env.example .env   # заполнить токены
npm run build && npm start
```

Бекенд раздаёт собранный фронт (`SERVE_DIST=../app/dist`) и поднимает бота. Детали и деплой — в `backend/README.md`.
