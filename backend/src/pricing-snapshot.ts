import { PRODUCTS } from './products.js';
import { getOffers } from './fazer.js';
import { refreshFazerPricing, resolvedBuyUsd, buyRub, catalogSyncMeta, getRateRub } from './catalog-sync.js';
import { markupOf, getConfig } from './config.js';
import { priceOf } from './catalog.js';

const UC_OFFERS = ['60_uc', '325_uc', '660_uc'] as const;

function roundRule(): string {
  return 'Math.round (математическое округление до целого ₽, 0.5 → вверх)';
}

export interface PricingSnapshot {
  generated_at_utc: string;
  category_id: string;
  rate_source: string;
  rate_rub: number;
  rounding_buy_rub: string;
  rounding_retail: string;
  markup_formula: string;
  catalog_sync: ReturnType<typeof catalogSyncMeta>;
  offers_raw: Array<{ offer_id: string; name: string; price_usd: number | string }>;
  packages: Array<{
    uc: number;
    offer_id: string;
    product_id: string;
    price_usd_api: number | null;
    price_usd_used: number;
    price_usd_source: 'offers_sync' | 'catalog_fallback';
    rate_rub: number;
    buy_rub_formula: string;
    buy_rub: number;
    markup_percent: number;
    retail_rub: number;
  }>;
}

/** Снимок для сверки с Fazer Support (живой запрос offers + rates). */
export async function buildPricingSnapshot(liveRefresh = true): Promise<PricingSnapshot> {
  if (liveRefresh) await refreshFazerPricing();

  const rate = await getRateRub();
  const channel = 'pubg_mobile_auto';
  const offers = await getOffers(channel);
  const byOffer = new Map(offers.map((o) => [o.offer_id, o]));

  const cfg = getConfig();
  const packages = UC_OFFERS.map((offerId) => {
    const p = PRODUCTS.find((x) => x.offerId === offerId)!;
    const raw = byOffer.get(offerId);
    const apiUsd =
      raw?.price_usd != null
        ? typeof raw.price_usd === 'number'
          ? raw.price_usd
          : Number.parseFloat(String(raw.price_usd))
        : null;
    const used = resolvedBuyUsd(p);
    const synced = used !== p.buyUsd;
    const markup = markupOf(cfg, p.id, p.defaultMarkup);
    const buy = buyRub(p, rate);
    return {
      uc: p.uc,
      offer_id: offerId,
      product_id: p.id,
      price_usd_api: apiUsd != null && Number.isFinite(apiUsd) ? apiUsd : null,
      price_usd_used: used,
      price_usd_source: synced ? 'offers_sync' as const : 'catalog_fallback' as const,
      rate_rub: rate,
      buy_rub_formula: `round(${used} × ${rate})`,
      buy_rub: buy,
      markup_percent: markup,
      retail_rub: priceOf(p, markup, rate),
    };
  });

  return {
    generated_at_utc: new Date().toISOString(),
    category_id: channel,
    rate_source: 'GET /steam-topup/rates → rates.RUB',
    rate_rub: rate,
    rounding_buy_rub: roundRule(),
    rounding_retail: roundRule(),
    markup_formula:
      'закуп ₽ = round(price_usd × rate_rub); витрина ₽ = round(закуп × (1 + markup%/100)); минимальной наценки нет',
    catalog_sync: catalogSyncMeta(),
    offers_raw: offers
      .filter((o) => (UC_OFFERS as readonly string[]).includes(o.offer_id))
      .map((o) => ({ offer_id: o.offer_id, name: o.name, price_usd: o.price_usd })),
    packages,
  };
}
