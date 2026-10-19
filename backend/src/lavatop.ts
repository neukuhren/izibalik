import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

export interface LavatopCreateResult {
  paymentNo: string;
  redirect: string;
}

export function lavaBusinessConfigured(): boolean {
  return Boolean(env.lavaShopId && env.lavaSecretKey);
}

export function payucConfigured(): boolean {
  return Boolean(env.lavatopApiKey);
}

/** PayUC / Lava Top: вебхуки только с allowlist IP, если не включён LAVA Business. */
export function usePayucWebhookIpFilter(): boolean {
  return payucConfigured() && !lavaBusinessConfigured() && env.lavatopWebhookIps.length > 0;
}

function lavaBusinessSign(rawBody: string): string {
  return createHmac('sha256', env.lavaSecretKey).update(rawBody).digest('hex');
}

async function lavaBusinessPost(path: string, params: Record<string, unknown>): Promise<any> {
  const body = JSON.stringify(params);
  const r = await fetch(`${env.lavaApiBase}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Signature: lavaBusinessSign(body),
    },
    body,
    signal: AbortSignal.timeout(25_000),
  });
  const data = await parseJson(r);
  if (!r.ok && !data?.status_check) {
    const msg = data?.error || data?.message || `HTTP ${r.status}`;
    throw new Error(String(msg));
  }
  return data;
}

/** Счёт LAVA Business: POST /business/invoice/create */
export async function createLavaBusinessInvoice(
  orderId: string,
  amountRub: number,
  description: string,
): Promise<LavatopCreateResult> {
  if (!lavaBusinessConfigured()) throw new Error('LAVA Business не настроена (LAVA_SHOP_ID, LAVA_SECRET_KEY)');

  const hookUrl = `${env.publicUrl}/api/webhooks/lavatop`;
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

  const r = await lavaBusinessPost('/business/invoice/create', params);
  const data = r.data;
  if (!r.status_check) {
    throw new Error(String(r.error || 'LAVA: ошибка создания счёта'));
  }
  const invoice = data as Record<string, unknown> | undefined;
  const redirect = String(invoice?.url || invoice?.URL || invoice?.payment_url || invoice?.paymentUrl || '');
  const paymentNo = String(invoice?.id || invoice?.invoice_id || invoice?.invoiceId || '');
  if (!redirect) throw new Error('LAVA не вернула ссылку на оплату');
  return { paymentNo, redirect };
}

function apiKeyHeader(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Api-Key': env.lavatopApiKey,
  };
}

async function parseJson(r: Response): Promise<any> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Lava Top: неверный JSON (${r.status})`);
  }
}

/** Создание платежа: POST {initUrl} (PayUC billing-api/init, AIO PayCore). */
export async function createLavatopPayment(
  orderId: string,
  amountRub: number,
  description: string,
): Promise<LavatopCreateResult> {
  if (lavaBusinessConfigured()) return createLavaBusinessInvoice(orderId, amountRub, description);
  if (!env.lavatopApiKey) throw new Error('Lava Top не настроена (LAVATOP_API_KEY или LAVA_SHOP_ID)');

  const successUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=1`;
  const cancelUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=0`;
  const payokUrl = `${env.publicUrl}/api/webhooks/lavatop`;

  const body: Record<string, unknown> = {
    merchant_order_no: orderId,
    amount: Math.round(amountRub),
    currency: 'RUB',
    item_name: description.slice(0, 200),
    description: description.slice(0, 200),
    success_url: successUrl,
    cancel_url: cancelUrl,
    payok_url: payokUrl,
  };

  const r = await fetch(env.lavatopInitUrl, {
    method: 'POST',
    headers: apiKeyHeader(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });

  const data = await parseJson(r);
  if (!r.ok) {
    const plain = typeof data === 'string' ? data.trim() : '';
    const msg = plain || data?.message || data?.error || `HTTP ${r.status}`;
    if (r.status === 403 && /user not found/i.test(String(msg))) {
      throw new Error(
        'Lava Top / PayUC: ключ не принят (User not found). Попросите поддержку активировать API-ключ для billing-api/init.',
      );
    }
    throw new Error(String(msg));
  }

  const root = data?.data && typeof data.data === 'object' ? data.data : data;
  const paymentNo = String(
    root?.payment_no || root?.paymentNo || root?.payment_id || root?.id || '',
  );
  const redirect = String(
    root?.payment_url || root?.paymentUrl || root?.redirect || root?.url || data?.payment_url || '',
  );
  if (!redirect) throw new Error('Lava Top не вернула ссылку на оплату');
  return { paymentNo, redirect };
}

export type LavatopWebhookBody = Record<string, unknown>;

function headerOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

/** IP, с которого Lava Top / PayUC шлёт вебхуки (87.232.67.91). */
export function verifyLavatopWebhookIp(remoteIp: string): boolean {
  const allowed = env.lavatopWebhookIps;
  if (!allowed.length) return true;
  const ip = remoteIp.replace(/^::ffff:/, '');
  return allowed.includes(ip);
}

/** Опционально: X-Api-Key на вебхуке (ключ сервиса в настройках Lava). */
export function verifyLavatopWebhookApiKey(reqHeaders: Record<string, string | string[] | undefined>): boolean {
  const expected = env.lavatopWebhookApiKey;
  if (!expected) return true;
  const got = headerOne(reqHeaders['x-api-key']) || headerOne(reqHeaders['X-Api-Key']);
  return got === expected;
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

/** LAVA Business: HMAC-SHA256(raw JSON body, дополнительный ключ). Заголовок Signature или Authorization. */
export function verifyLavaBusinessWebhookSignature(
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

function sortKeysDeep(v: unknown): unknown {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return v;
  const obj = v as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) out[k] = sortKeysDeep(obj[k]);
  return out;
}

/** PayCore payment.paid: HMAC-SHA256 по сырому телу. */
export function verifyPaycoreSignature(
  rawBody: string,
  reqHeaders: Record<string, string | string[] | undefined>,
): boolean {
  const secret = env.lavatopCallbackSecret;
  if (!secret) return true;
  const sig = headerOne(reqHeaders['x-paycore-signature']);
  const ts = headerOne(reqHeaders['x-paycore-timestamp']);
  if (!sig || !ts) return false;
  const m = /^v1=(.+)$/i.exec(sig.trim());
  if (!m) return false;
  const expected = createHmac('sha256', secret).update(`${rawBody}|${ts}|${secret}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(m[1], 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return m[1] === expected;
  }
}

export interface LavatopPaidEvent {
  orderId: string;
  amountRub?: number;
  providerId?: string;
}

/** Разбор payment.paid (PayUC) и payment.success (Lava Top). */
export function parseLavatopPaidEvent(body: LavatopWebhookBody): LavatopPaidEvent | null {
  const eventType = String(body.event_type || body.eventType || '').toLowerCase();
  const status = String(body.status || '').toLowerCase();

  if (eventType === 'payment.paid' && (!status || status === 'paid')) {
    const orderId = String(body.merchant_order_no || '').trim();
    if (!orderId) return null;
    const amt = body.amount != null ? Math.round(Number(body.amount)) : undefined;
    return { orderId, amountRub: amt, providerId: String(body.payment_no || '') || undefined };
  }

  if (eventType === 'payment.success' || body.eventType === 'payment.success') {
    const orderId = String(
      body.merchant_order_no ||
        body.merchantOrderId ||
        (body.customFields as any)?.orderId ||
        (body.custom_fields as any)?.order_id ||
        body.payload ||
        '',
    ).trim();
    if (!orderId) return null;
    const product = body.product as { amount?: unknown } | undefined;
    const amt =
      body.amount != null
        ? Math.round(Number(body.amount))
        : product?.amount != null
          ? Math.round(Number(product.amount))
          : undefined;
    return {
      orderId,
      amountRub: amt,
      providerId: String(body.contractId || body.invoiceId || ''),
    };
  }

  // Плоский PayCore без event_type
  if (status === 'paid' && body.merchant_order_no) {
    return {
      orderId: String(body.merchant_order_no),
      amountRub: body.amount != null ? Math.round(Number(body.amount)) : undefined,
      providerId: String(body.payment_no || ''),
    };
  }

  const lavaOrderId = String(body.orderId || body.order_id || '').trim();
  const lavaStatus = String(body.status || '').toLowerCase();
  if (lavaOrderId && (lavaStatus === 'success' || lavaStatus === 'paid')) {
    const amt =
      body.amount != null
        ? Math.round(Number(body.amount))
        : body.sum != null
          ? Math.round(Number(body.sum))
          : undefined;
    return {
      orderId: lavaOrderId,
      amountRub: amt,
      providerId: String(body.invoice_id || body.invoiceId || body.id || ''),
    };
  }

  return null;
}
