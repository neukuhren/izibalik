// Сверка каталога/закупочных цен PUBG с FazerCards.
// Запуск: FAZER_API_KEY=fc_... node tools/fetch-fazer-catalog.mjs
// Печатает офферы всех PUBG-категорий + курс USD→RUB.
// В проде buyUsd подтягивается автоматически (backend/src/catalog-sync.ts, раз в час).
// Скрипт — для ручной сверки и обновления fallback в products.ts / prototypeLogic.ts.
const KEY = process.env.FAZER_API_KEY;
if (!KEY) { console.error('FAZER_API_KEY не задан'); process.exit(1); }

const API = 'https://api.fzr.cards/api/v2';
const get = async path => {
  const r = await fetch(API + path, { headers: { 'X-API-Key': KEY } });
  return r.json();
};

const CATS = ['pubg_mobile_auto', 'pubg_mobile_fast', 'pubg_mobile_manual', 'pubg_mobile_reserve', 'pubg_new_state'];

const rates = await get('/steam-topup/rates');
console.log('USD→RUB:', rates.rates?.RUB);
const bal = await get('/balance');
console.log('Баланс поставщика:', bal.balance, bal.currency, '\n');

for (const c of CATS) {
  const r = await get('/topups/offers?category_id=' + c);
  console.log('=== ' + c + ' ===');
  for (const o of r.offers || []) console.log(`${o.offer_id.padEnd(36)} ${o.name.padEnd(32)} $${o.price_usd}`);
  console.log();
}
