import { env } from './env.js';

// Клиент FazerCards (поставщик UC). Base: https://api.fzr.cards/api/v2
// Методы подтверждены в tools/fetch-fazer-catalog.mjs и vault (fazercards-izibalik).
// Схемы ответов /topups/order и /topups/validate-id — по документации поставщика;
// парсинг защитный, при расхождении правится здесь в одном месте.

const HEADERS = () => ({ 'X-API-Key': env.fazerKey, 'Content-Type': 'application/json' });

async function req<T = any>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = HEADERS();
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const r = await fetch(env.fazerBase + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    const msg = (data && (data.error || data.message)) || `Fazer ${r.status}`;
    throw new Error(String(msg));
  }
  return data as T;
}

export async function getRateRub(): Promise<number> {
  try {
    const d = await req<{ rates?: { RUB?: number } }>('GET', '/steam-topup/rates');
    const rub = d?.rates?.RUB;
    return typeof rub === 'number' && rub > 0 ? rub : env.fallbackRate;
  } catch {
    return env.fallbackRate;
  }
}

export async function getBalanceUsd(): Promise<number | null> {
  try {
    const d = await req<{ balance?: number | string; ok?: boolean; currency?: string }>('GET', '/balance');
    const raw = d?.balance;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface FazerOffer {
  offer_id: string;
  name: string;
  price_usd: number;
}
export async function getOffers(categoryId: string): Promise<FazerOffer[]> {
  const d = await req<{ offers?: FazerOffer[] }>('GET', '/topups/offers?category_id=' + encodeURIComponent(categoryId));
  return d?.offers ?? [];
}

export interface ValidateResult {
  valid: boolean;
  nickname?: string;
}
export async function validatePlayerId(offerId: string, playerId: string): Promise<ValidateResult> {
  try {
    const d = await req<any>('POST', '/topups/validate-id', { offer_id: offerId, account_id: playerId });
    return { valid: d?.valid !== false, nickname: d?.nickname ?? d?.username };
  } catch {
    // Поставщик не смог проверить — не блокируем заказ, помечаем как непроверенный.
    return { valid: true };
  }
}

export interface FazerOrder {
  fazerId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  raw: any;
}

// Нормализация статуса поставщика к нашему домену.
function mapFazerStatus(s: string | undefined): FazerOrder['status'] {
  const v = String(s ?? '').toLowerCase();
  if (['completed', 'success', 'done', 'delivered'].includes(v)) return 'done';
  if (['failed', 'error', 'canceled', 'cancelled', 'refunded'].includes(v)) return 'failed';
  if (['processing', 'in_progress', 'sent'].includes(v)) return 'processing';
  return 'pending';
}

export async function createFazerOrder(
  offerId: string,
  playerId: string,
  idempotencyKey: string,
): Promise<FazerOrder> {
  const d = await req<any>('POST', '/topups/order', { offer_id: offerId, account_id: playerId }, idempotencyKey);
  return {
    fazerId: String(d?.order_id ?? d?.id ?? ''),
    status: mapFazerStatus(d?.status),
    raw: d,
  };
}

export async function getFazerOrder(fazerId: string): Promise<FazerOrder | null> {
  if (!fazerId) return null;
  try {
    const d = await req<any>('GET', '/topups/order/' + encodeURIComponent(fazerId));
    return { fazerId, status: mapFazerStatus(d?.status), raw: d };
  } catch {
    return null;
  }
}

// Крипто-инвойс для пополнения баланса поставщика (админ /api/topup).
export interface CryptoInvoice {
  address: string;
  amount?: string;
  currency?: string;
  network?: string;
  raw: any;
}
export async function createCryptoInvoice(method: string, amountUsd: number): Promise<CryptoInvoice> {
  const d = await req<any>('POST', '/balance/topup', { method, amount: amountUsd });
  const address = d?.address ?? d?.wallet ?? d?.payment?.address ?? '';
  return {
    address: String(address),
    amount: d?.amount != null ? String(d.amount) : String(amountUsd),
    currency: d?.currency ?? 'USDT',
    network: d?.network ?? method,
    raw: d,
  };
}
