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

function isLavaPaidStatus(v: unknown): boolean {
  if (v === 2 || v === '2') return true;
  const s = String(v ?? '').toLowerCase();
  return s === 'success' || s === 'paid' || s === 'completed' || s === 'complete';
}

/** Опрос LAVA, если вебхук не дошёл (см. /business/invoice/status). */
export async function getLavaInvoicePaidByOrderId(orderId: string): Promise<boolean> {
  if (!lavaConfigured()) return false;
  const resp = await lavaBusinessPost('/business/invoice/status', {
    orderId,
    shopId: env.lavaShopId,
  });
  if (!resp?.status_check) return false;
  const data = resp.data as Record<string, unknown> | undefined;
  if (!data) return false;
  if (isLavaPaidStatus(data.status)) return true;
  return isLavaPaidStatus(data.state) || isLavaPaidStatus(data.payment_status);
}

export type LavaWebhookBody = Record<string, unknown>;

function headerOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  const s = (v ?? '').trim();
  return s.replace(/^bearer\s+/i, '');
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

/** Как в lava-payment/lava ClientCheckSignatureWebhook: ksort только верхнего уровня + json_encode. */
function topLevelSortedJson(rawBody: string): string | null {
  try {
    const data = JSON.parse(rawBody) as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(data).sort()) sorted[k] = data[k];
    return JSON.stringify(sorted);
  } catch {
    return null;
  }
}

function webhookSignatureCandidates(rawBody: string): string[] {
  const candidates: string[] = [];
  const trimmed = rawBody.trim();
  if (trimmed) candidates.push(trimmed);
  const top = topLevelSortedJson(trimmed);
  if (top && top !== trimmed) candidates.push(top);
  try {
    const deep = JSON.stringify(sortKeysDeep(JSON.parse(trimmed) as Record<string, unknown>));
    if (!candidates.includes(deep)) candidates.push(deep);
  } catch {
    /* ignore */
  }
  return candidates;
}

/** Дополнительный ключ из ЛК — HMAC-SHA256 (см. dev.lava.ru и SDK checkSignWebhook). */
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
  for (const payload of webhookSignatureCandidates(rawBody)) {
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    if (signaturesMatch(sig, expected)) return true;
  }
  return false;
}

export interface LavaPaidEvent {
  orderId: string;
  amountRub?: number;
  invoiceId?: string;
}

function lavaWebhookPayload(body: LavaWebhookBody): LavaWebhookBody {
  const nested = body.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...(nested as LavaWebhookBody), ...body };
  }
  return body;
}

export function parseLavaPaidWebhook(body: LavaWebhookBody): LavaPaidEvent | null {
  const b = lavaWebhookPayload(body);
  const orderId = String(b.orderId || b.order_id || '').trim();
  if (!orderId) return null;
  const paid =
    isLavaPaidStatus(b.status) ||
    isLavaPaidStatus(b.state) ||
    isLavaPaidStatus(b.payment_status) ||
    String(b.type || '').toLowerCase() === 'payment.success';
  if (!paid) return null;
  const amt =
    b.amount != null
      ? Math.round(Number(b.amount))
      : b.sum != null
        ? Math.round(Number(b.sum))
        : undefined;
  return {
    orderId,
    amountRub: amt,
    invoiceId: String(b.invoice_id || b.invoiceId || b.id || '') || undefined,
  };
}
