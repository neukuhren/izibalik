import { env } from './env.js';
import { PRODUCTS, type Product } from './products.js';
import { fetchRateRub, getOffers } from './fazer.js';

export const SYNC_INTERVAL_MS = 60 * 60 * 1000;

interface PricingCache {
  rateRub: number;
  buyUsdById: Map<string, number>;
  syncedAt: number;
}

let cache: PricingCache | null = null;
let refreshInFlight: Promise<void> | null = null;

function parseUsd(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Курс + price_usd всех офферов Fazer (по каналам каталога). */
export async function refreshFazerPricing(): Promise<void> {
  const rateRub = await fetchRateRub();
  const buyUsdById = new Map<string, number>();

  const channels = [...new Set(PRODUCTS.map((p) => p.channel))];
  for (const channel of channels) {
    let offers: Awaited<ReturnType<typeof getOffers>> = [];
    try {
      offers = await getOffers(channel);
    } catch (e) {
      console.warn(`[catalog-sync] offers ${channel}:`, (e as Error).message);
      continue;
    }
    const byOffer = new Map<string, number>();
    for (const o of offers) {
      const usd = parseUsd(o.price_usd);
      if (usd != null) byOffer.set(o.offer_id, usd);
    }
    for (const p of PRODUCTS.filter((x) => x.channel === channel)) {
      const usd = byOffer.get(p.offerId);
      if (usd != null) buyUsdById.set(p.id, usd);
      else console.warn(`[catalog-sync] нет оффера ${p.offerId} (${p.id}) в ${channel}`);
    }
  }

  cache = { rateRub, buyUsdById, syncedAt: Date.now() };
  console.log(
    `[catalog-sync] курс ${rateRub} ₽/$, закупок обновлено ${buyUsdById.size}/${PRODUCTS.length}`,
  );
}

async function ensureFresh(): Promise<void> {
  const stale = !cache || Date.now() - cache.syncedAt >= SYNC_INTERVAL_MS;
  if (!stale) return;
  if (!refreshInFlight) {
    refreshInFlight = refreshFazerPricing()
      .catch((e) => console.error('[catalog-sync] refresh failed:', (e as Error).message))
      .finally(() => {
        refreshInFlight = null;
      });
  }
  await refreshInFlight;
}

export function resolvedBuyUsd(p: Product): number {
  const synced = cache?.buyUsdById.get(p.id);
  return synced ?? p.buyUsd;
}

export const buyRub = (p: Product, rate = env.fallbackRate): number =>
  Math.round(resolvedBuyUsd(p) * rate);

export function catalogForClient(rate: number) {
  return PRODUCTS.map((p) => ({
    id: p.id,
    buyUsd: resolvedBuyUsd(p),
    buyRub: buyRub(p, rate),
    defaultMarkup: p.defaultMarkup,
  }));
}

export function catalogSyncMeta() {
  return {
    catalog_synced_at: cache ? Math.floor(cache.syncedAt / 1000) : null,
    offers_synced: cache ? cache.buyUsdById.size : 0,
    offers_total: PRODUCTS.length,
  };
}

export async function getRateRub(): Promise<number> {
  await ensureFresh();
  return cache?.rateRub ?? env.fallbackRate;
}

export function startFazerPricingRefresh(): void {
  const tick = () => {
    void refreshFazerPricing().catch((e) => console.error('[catalog-sync]', (e as Error).message));
  };
  tick();
  setInterval(tick, SYNC_INTERVAL_MS);
}
