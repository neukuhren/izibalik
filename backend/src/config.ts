import { getConfigRow, setConfigRow, now } from './db.js';
import { PRODUCTS, type Promo } from './catalog.js';

export interface ShopConfig {
  markups: Record<string, number>;
  active: Record<string, boolean>;
  bulkMarkup: number;
  promos: Promo[];
}

export function defaultConfig(): ShopConfig {
  const markups: Record<string, number> = {};
  const active: Record<string, boolean> = {};
  for (const p of PRODUCTS) {
    markups[p.id] = p.defaultMarkup;
    active[p.id] = true;
  }
  return { markups, active, bulkMarkup: 22, promos: [] };
}

export function getConfig(): ShopConfig {
  const row = getConfigRow.get() as { json: string } | undefined;
  const def = defaultConfig();
  if (!row) return def;
  try {
    const c = JSON.parse(row.json) as Partial<ShopConfig>;
    return {
      markups: { ...def.markups, ...(c.markups ?? {}) },
      active: { ...def.active, ...(c.active ?? {}) },
      bulkMarkup: typeof c.bulkMarkup === 'number' ? c.bulkMarkup : def.bulkMarkup,
      promos: Array.isArray(c.promos) ? c.promos : [],
    };
  } catch {
    return def;
  }
}

export function saveConfig(cfg: Partial<ShopConfig>): ShopConfig {
  const merged = { ...getConfig(), ...cfg };
  // нормализация наценок 0..99, как в админке
  const clamp = (n: number) => Math.max(0, Math.min(99, Math.round(n)));
  for (const k of Object.keys(merged.markups)) merged.markups[k] = clamp(merged.markups[k]);
  merged.bulkMarkup = clamp(merged.bulkMarkup);
  setConfigRow.run({ json: JSON.stringify(merged), updated_at: now() });
  return merged;
}

// Эффективная наценка товара: индивидуальная markup из конфига, иначе дефолт.
export function markupOf(cfg: ShopConfig, productId: string, fallback: number): number {
  const m = cfg.markups[productId];
  return typeof m === 'number' ? m : fallback;
}

export function findPromo(cfg: ShopConfig, code: string): Promo | null {
  if (!code) return null;
  const p = cfg.promos.find((x) => x.code.toLowerCase() === code.toLowerCase());
  if (!p) return null;
  if (p.limit != null && (p.used ?? 0) >= p.limit) return null;
  return p;
}

export function bumpPromoUsed(code: string): void {
  const cfg = getConfig();
  const p = cfg.promos.find((x) => x.code.toLowerCase() === code.toLowerCase());
  if (!p) return;
  p.used = (p.used ?? 0) + 1;
  setConfigRow.run({ json: JSON.stringify(cfg), updated_at: now() });
}
