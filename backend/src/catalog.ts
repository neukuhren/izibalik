import { env } from './env.js';

// Каталог PUBG/New State — единый источник истины на сервере.
// Держать синхронным с app/src/logic/prototypeLogic.ts (RAW).
// buyUsd — закупка у FazerCards; offerId + channel нужны для /topups/order.

export interface Product {
  id: string;
  game: 'pubgm' | 'newstate';
  sub: string;
  offerId: string;
  name: string;
  buyUsd: number;
  defaultMarkup: number;
  channel: string;
  uc: number;
  unit: string;
}

type Raw = [string, string, string, string, string, number, { uc?: number; unit?: string; markup?: number }?];

const RAW: Raw[] = [
  ['pubgm', 'uc', 'p60', '60_uc', '60 UC', 0.8547, { uc: 60, markup: 25 }],
  ['pubgm', 'uc', 'p325', '325_uc', '325 UC', 4.3826, { uc: 325 }],
  ['pubgm', 'uc', 'p660', '660_uc', '660 UC', 8.6997, { uc: 660 }],
  ['pubgm', 'uc', 'p1800', '1800_uc', '1800 UC', 21.9131, { uc: 1800 }],
  ['pubgm', 'uc', 'p3850', '3850_uc', '3850 UC', 43.6825, { uc: 3850 }],
  ['pubgm', 'uc', 'p8100', '8100_uc', '8100 UC', 88.7733, { uc: 8100 }],
  ['pubgm', 'prime', 'pr1', 'prime_1_month', 'Прайм · 1 мес', 0.8455],
  ['pubgm', 'prime', 'pr3', 'prime_3_months', 'Прайм · 3 мес', 2.5443],
  ['pubgm', 'prime', 'pr6', 'prime_6_months', 'Прайм · 6 мес', 5.0887],
  ['pubgm', 'prime', 'pr12', 'prime_12_months', 'Прайм · 12 мес', 10.1773],
  ['pubgm', 'prime', 'prp1', 'prime_plus_1_month', 'Прайм Плюс · 1 мес', 8.4784],
  ['pubgm', 'prime', 'prp3', 'prime_plus_3_months', 'Прайм Плюс · 3 мес', 25.4353],
  ['pubgm', 'prime', 'prp6', 'prime_plus_6_months', 'Прайм Плюс · 6 мес', 50.8707],
  ['pubgm', 'prime', 'prp12', 'prime_plus_12_months', 'Прайм Плюс · 12 мес', 101.7493],
  ['pubgm', 'mythic', 'wme', 'weekly_mythic_emblem_value_pack', 'Мифические кристаллы · Weekly', 2.5834],
  ['pubgm', 'mythic', 'mep', 'mythic_emblem_pack', 'Мифические кристаллы · Pack', 4.2432],
  ['pubgm', 'other', 'ep50', 'elite_pass_lv1_50', 'Elite Pass · LV1–50', 4.7207],
  ['pubgm', 'other', 'ep100', 'elite_pass_lv1_100', 'Elite Pass · LV1–100', 9.4414],
  ['pubgm', 'other', 'epp100', 'elite_pass_plus_lv1_100', 'Elite Pass Plus · LV1–100', 23.5957],
  ['pubgm', 'other', 'fpp', 'first_purchase_pack', 'First Purchase Pack', 0.8455],
  ['pubgm', 'other', 'wd1', 'weekly_deal_pack_1', 'Weekly Deal · Pack 1', 0.8611],
  ['pubgm', 'other', 'wd2', 'weekly_deal_pack_2', 'Weekly Deal · Pack 2', 2.5834],
  ['pubgm', 'other', 'ufm', 'upgradable_firearm_materials_pack', 'Материалы оружия · Pack', 2.5443],
  ['newstate', 'nc', 'nc300', '300_nc', '300 NC', 0.9874, { uc: 300, unit: 'NC' }],
  ['newstate', 'nc', 'nc1580', '1580_nc', '1580 NC', 4.9368, { uc: 1580, unit: 'NC' }],
  ['newstate', 'nc', 'nc3850', '3850_nc', '3850 NC', 11.8482, { uc: 3850, unit: 'NC' }],
  ['newstate', 'nc', 'nc10230', '10230_nc', '10230 NC', 30.6078, { uc: 10230, unit: 'NC' }],
  ['newstate', 'nc', 'nc16800', '16800_nc', '16800 NC', 49.3675, { uc: 16800, unit: 'NC' }],
  ['newstate', 'nc', 'nc35000', '35000_nc', '35000 NC', 98.735, { uc: 35000, unit: 'NC' }],
];

export const PRODUCTS: Product[] = RAW.map(([game, sub, id, offerId, name, buyUsd, x = {}]) => ({
  id,
  game: game as Product['game'],
  sub,
  offerId,
  name,
  buyUsd,
  defaultMarkup: x.markup ?? 22,
  channel: game === 'newstate' ? 'pubg_new_state' : 'pubg_mobile_auto',
  uc: x.uc ?? 0,
  unit: x.unit ?? 'UC',
}));

const BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id: string): Product | undefined => BY_ID.get(id);

// Закупка в рублях по фиксированному курсу (совпадает с витриной).
export const buyRub = (p: Product, rate = env.fallbackRate): number => Math.round(p.buyUsd * rate);

export interface Promo {
  code: string;
  kind: 'pct' | 'fixed';
  val: number;
  limit?: number;
  used?: number;
}

// Цена = закупка * (1 + наценка%). Наценка берётся из конфига (override) или дефолт.
export function priceOf(p: Product, markup: number, rate = env.fallbackRate): number {
  return Math.round(buyRub(p, rate) * (1 + markup / 100));
}

// Скидка по промокоду: pct → % от цены; fixed → фикс, но не больше цены-1.
export function discountFor(price: number, promo: Promo | null): number {
  if (!promo) return 0;
  if (promo.kind === 'pct') return Math.round((price * promo.val) / 100);
  return Math.min(promo.val, price - 1);
}
