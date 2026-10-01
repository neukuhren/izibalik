// Снимок для ответа в поддержку Fazer. Запуск на сервере:
//   cd /opt/projects/izibalik/backend && npm run job:pricing-snapshot
// или из корня (нужен FAZER_API_KEY в backend/.env):
//   FAZER_API_KEY=fc_... node tools/pricing-snapshot-support.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const API = 'https://api.fzr.cards/api/v2';

function loadKey() {
  if (process.env.FAZER_API_KEY) return process.env.FAZER_API_KEY;
  try {
    const raw = readFileSync(resolve(__dir, '../backend/.env'), 'utf8');
    const m = raw.match(/^FAZER_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
  return '';
}

const KEY = loadKey();
if (!KEY) {
  console.error('FAZER_API_KEY не задан');
  process.exit(1);
}

const get = async (path) => {
  const r = await fetch(API + path, { headers: { 'X-API-Key': KEY } });
  return r.json();
};

const UC = ['60_uc', '325_uc', '660_uc'];
const round = (n) => Math.round(n);

const ts = new Date().toISOString();
const rates = await get('/steam-topup/rates');
const rateRub = rates?.rates?.RUB;
const offers = await get('/topups/offers?category_id=pubg_mobile_auto');
const list = (offers.offers || []).filter((o) => UC.includes(o.offer_id));

const packages = list.map((o) => {
  const usd = Number(o.price_usd);
  const buy = round(usd * rateRub);
  return {
    offer_id: o.offer_id,
    name: o.name,
    price_usd: usd,
    rate_rub: rateRub,
    buy_rub: buy,
    formula: `round(${usd} × ${rateRub}) = ${buy}`,
  };
});

const out = {
  generated_at_utc: ts,
  category_id: 'pubg_mobile_auto',
  rate_source: 'GET /steam-topup/rates',
  rate_rub: rateRub,
  rounding: 'Math.round до целого ₽',
  markup_note: 'закуп в админке = buy_rub; наценка % применяется отдельно к витрине',
  offers: list.map((o) => ({ offer_id: o.offer_id, price_usd: o.price_usd, name: o.name })),
  packages,
};

console.log(JSON.stringify(out, null, 2));
