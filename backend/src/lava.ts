import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

export interface LavaCreateResult {
  invoiceId: string;
  redirect: string;
}

export function lavaConfigured(): boolean {
  return Boolean(env.lavaShopId && env.lavaSecretKey);
}

export function lavaWebhookPath(): string {
  return env.lavaWebhookPath;
}

export function lavaWebhookUrl(): string {
  const base = env.publicUrl.replace(/\/$/, '');
  return `${base}${lavaWebhookPath()}`;
}

function signBody(rawBody: string): string {
  return createHmac('sha256', env.lavaSecretKey).update(rawBody).digest('hex');
}

/** SDK lava-payment/lava: ksort + json_encode перед подписью исходящих запросов. */
function sortedParams(params: Record<string, unknown>): Record<string, unknown> {
  return sortKeysDeep(params) as Record<string, unknown>;
}

/** Подпись и запрос к LAVA Business API (https://developer.lava.ru/). */
export async function lavaBusinessPost(path: string, params: Record<string, unknown>): Promise<any> {
  const ordered = sortedParams(params);
  const body = JSON.stringify(ordered);
  const r = await fetch(`${env.lavaApiBase}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Signature: signBody(body),
    },
    body,
    signal: AbortSignal.timeout(25_000),
  });
  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (!r.ok) {
      throw new Error(`LAVA: HTTP ${r.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    }
  }
  if (!r.ok && !data?.status_check) {
    const msg = data?.error || data?.message || text?.trim() || `HTTP ${r.status}`;
    throw new Error(String(msg));
  }
  return data;
}

/** POST /business/invoice/create */
export async function createLavaInvoice(
  orderId: string,
  amountRub: number,
  description: string,
): Promise<LavaCreateResult> {
  if (!lavaConfigured()) {
    throw new Error('LAVA не настроена: задайте LAVA_SHOP_ID и LAVA_SECRET_KEY (секретный ключ API в ЛК)');
  }

  const hookUrl = lavaWebhookUrl();
  const successUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=1`;
  const failUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=0`;

  const params: Record<string, unknown> = {
    sum: amountRub,
    orderId,
    shopId: env.lavaShopId,
    hookUrl,
    successUrl,
    failUrl,
    comment: description.slice(0, 255),
  };

  const resp = await lavaBusinessPost('/business/invoice/create', params);
  if (!resp?.status_check) {
    throw new Error(String(resp?.error || 'LAVA: не удалось создать счёт'));
  }
  const invoice = resp.data as Record<string, unknown> | undefined;
  const redirect = String(invoice?.url || invoice?.URL || invoice?.payment_url || invoice?.paymentUrl || '');
  const invoiceId = String(invoice?.id || invoice?.invoice_id || invoice?.invoiceId || '');
  if (!redirect) throw new Error('LAVA не вернула ссылку на оплату');
  return { invoiceId, redirect };
}

export type LavaWebhookBody = Record<string, unknown>;

function headerOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

function signaturesMatch(got: string, expected: string): boolean {
  const a = got.trim().toLowerCase();
  const b = expected.trim().toLowerCase();
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return a === b;
  }
}

function sortKeysDeep(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = sortKeysDeep(obj[k]);
  return out;
}

/** Дополнительный ключ из ЛК — HMAC-SHA256(raw body). */
export function verifyLavaWebhookSignature(
  rawBody: string,
  reqHeaders: Record<string, string | string[] | undefined>,
): boolean {
  const secret = env.lavaWebhookSecret;
  if (!secret) return true;
  const sig =
    headerOne(reqHeaders.signature) ||
    headerOne(reqHeaders.Signature) ||
    headerOne(reqHeaders.authorization) ||
    headerOne(reqHeaders.Authorization);
  if (!sig) return false;
  const direct = createHmac('sha256', secret).update(rawBody).digest('hex');
  if (signaturesMatch(sig, direct)) return true;
  try {
    const sorted = sortKeysDeep(JSON.parse(rawBody) as Record<string, unknown>);
    const legacy = createHmac('sha256', secret).update(JSON.stringify(sorted)).digest('hex');
    return signaturesMatch(sig, legacy);
  } catch {
    return false;
  }
}

export interface LavaPaidEvent {
  orderId: string;
  amountRub?: number;
  invoiceId?: string;
}

export function parseLavaPaidWebhook(body: LavaWebhookBody): LavaPaidEvent | null {
  const orderId = String(body.orderId || body.order_id || '').trim();
  const status = String(body.status || '').toLowerCase();
  if (orderId && (status === 'success' || status === 'paid')) {
    const amt =
      body.amount != null
        ? Math.round(Number(body.amount))
        : body.sum != null
          ? Math.round(Number(body.sum))
          : undefined;
    return {
      orderId,
      amountRub: amt,
      invoiceId: String(body.invoice_id || body.invoiceId || body.id || '') || undefined,
    };
  }
  return null;
}
