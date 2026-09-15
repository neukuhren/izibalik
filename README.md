# IZIBALIK — PUBG UC

Telegram Mini App: витрина и продажа PUBG UC / Fazer-карт, каталог товаров, админ-панель (наценки 0–99% на товар + общая).

## Структура

- `app/` — фронтенд (Vite + React 19 + TypeScript)
  - `src/view/AppView.tsx` — представление витрины
  - `src/logic/prototypeLogic.ts` — логика витрины и админки
  - `src/logic/useApp.ts` — React-обвязка над логикой
  - `src/telegram.ts` — bootstrap Telegram Mini App
  - `public/art/` — арты товаров (webp/svg)
- `tools/` — утилиты
  - `fetch-fazer-catalog.mjs` — сверка каталога и закупочных цен с FazerCards
  - `compress-arts.mjs` — сжатие PNG-артов в webp
- `legal/` — публичные документы (оферта, политика, условия)

## Запуск

```bash
cd app
npm install
npm run dev      # разработка
npm run build    # прод-сборка
npm run preview  # предпросмотр сборки
```

Открывается как Telegram Mini App; вне Telegram работает в браузере (dev).

## Переменные окружения

- `FAZER_API_KEY` — ключ FazerCards для `tools/fetch-fazer-catalog.mjs`.
