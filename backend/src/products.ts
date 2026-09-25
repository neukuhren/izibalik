// Статический каталог: id, offerId, канал Fazer. buyUsd — fallback до синхронизации с /topups/offers.
// Держать offerId синхронным с app/src/logic/prototypeLogic.ts (RAW).

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
  ['pubgm', 'uc', 'p60', '60_uc', '60 UC', 0.8904, { uc: 60, markup: 25 }],
  ['pubgm', 'uc', 'p325', '325_uc', '325 UC', 4.5135, { uc: 325 }],
  ['pubgm', 'uc', 'p660', '660_uc', '660 UC', 8.9306, { uc: 660 }],
  ['pubgm', 'uc', 'p1800', '1800_uc', '1800 UC', 22.3352, { uc: 1800 }],
  ['pubgm', 'uc', 'p3850', '3850_uc', '3850 UC', 44.4752, { uc: 3850 }],
  ['pubgm', 'uc', 'p8100', '8100_uc', '8100 UC', 88.66, { uc: 8100 }],
  ['pubgm', 'prime', 'pr1', 'prime_1_month', 'Прайм · 1 мес', 0.8866],
  ['pubgm', 'prime', 'pr3', 'prime_3_months', 'Прайм · 3 мес', 2.6598],
  ['pubgm', 'prime', 'pr6', 'prime_6_months', 'Прайм · 6 мес', 5.3196],
  ['pubgm', 'prime', 'pr12', 'prime_12_months', 'Прайм · 12 мес', 10.6392],
  ['pubgm', 'prime', 'prp1', 'prime_plus_1_month', 'Прайм Плюс · 1 мес', 8.866],
  ['pubgm', 'prime', 'prp3', 'prime_plus_3_months', 'Прайм Плюс · 3 мес', 26.598],
  ['pubgm', 'prime', 'prp6', 'prime_plus_6_months', 'Прайм Плюс · 6 мес', 52.39],
  ['pubgm', 'prime', 'prp12', 'prime_plus_12_months', 'Прайм Плюс · 12 мес', 105.7875],
  ['pubgm', 'mythic', 'wme', 'weekly_mythic_emblem_value_pack', 'Мифические кристаллы · Weekly', 2.6447],
  ['pubgm', 'mythic', 'mep', 'mythic_emblem_pack', 'Мифические кристаллы · Pack', 4.4219],
  ['pubgm', 'other', 'ep50', 'elite_pass_lv1_50', 'Elite Pass · LV1–50', 5.3398],
  ['pubgm', 'other', 'ep100', 'elite_pass_lv1_100', 'Elite Pass · LV1–100', 10.7722],
  ['pubgm', 'other', 'epp100', 'elite_pass_plus_lv1_100', 'Elite Pass Plus · LV1–100', 25.9018],
  ['pubgm', 'other', 'fpp', 'first_purchase_pack', 'First Purchase Pack', 0.8866],
  ['pubgm', 'other', 'wd1', 'weekly_deal_pack_1', 'Weekly Deal · Pack 1', 0.8775],
  ['pubgm', 'other', 'wd2', 'weekly_deal_pack_2', 'Weekly Deal · Pack 2', 2.6447],
  ['pubgm', 'other', 'ufm', 'upgradable_firearm_materials_pack', 'Материалы оружия · Pack', 2.6558],
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
