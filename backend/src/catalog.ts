import { env } from './env.js';
import { getProduct, type Product } from './products.js';
import { buyRub, catalogForClient, catalogSyncMeta, resolvedBuyUsd } from './catalog-sync.js';

export type { Product } from './products.js';
export { PRODUCTS, getProduct } from './products.js';
export { catalogForClient, catalogSyncMeta, resolvedBuyUsd, buyRub };

export interface Promo {
  code: string;
  kind: 'pct' | 'fixed';
  val: number;
  limit?: number;
  used?: number;
}

export function priceOf(p: Product, markup: number, rate = env.fallbackRate): number {
  return Math.round(buyRub(p, rate) * (1 + markup / 100));
}

export function discountFor(price: number, promo: Promo | null): number {
  if (!promo) return 0;
  if (promo.kind === 'pct') return Math.round((price * promo.val) / 100);
  return Math.min(promo.val, price - 1);
}
