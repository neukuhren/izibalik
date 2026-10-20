import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';

export interface LavatopCreateResult {
  paymentNo: string;
  redirect: string;
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

export function payucConfigured(): boolean {
  return Boolean(env.lavatopApiKey);
}

export function usePayucWebhookIpFilter(): boolean {
  return payucConfigured() && env.lavatopWebhookIps.length > 0;
}

/** Legacy Lava Top / PayUC: POST billing-api/init */
export async function createLavatopPayment(
  orderId: string,
  amountRub: number,
  description: string,
): Promise<LavatopCreateResult> {
  if (!env.lavatopApiKey) throw new Error('PayUC не настроен (LAVATOP_API_KEY)');

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
    throw new Error(String(msg));
  }

  const root = data?.data && typeof data.data === 'object' ? data.data : data;
  const paymentNo = String(
    root?.payment_no || root?.paymentNo || root?.payment_id || root?.id || '',
  );
  const redirect = String(
    root?.payment_url || root?.paymentUrl || root?.redirect || root?.url || data?.payment_url || '',
  );
  if (!redirect) throw new Error('PayUC не вернул ссылку на оплату');
  return { paymentNo, redirect };
}

export type LavatopWebhookBody = Record<string, unknown>;

function headerOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

export function verifyLavatopWebhookIp(remoteIp: string): boolean {
  const allowed = env.lavatopWebhookIps;
  if (!allowed.length) return true;
  const ip = remoteIp.replace(/^::ffff:/, '');
  return allowed.includes(ip);
}

export function verifyLavatopWebhookApiKey(reqHeaders: Record<string, string | string[] | undefined>): boolean {
  const expected = env.lavatopWebhookApiKey;
  if (!expected) return true;
  const got = headerOne(reqHeaders['x-api-key']) || headerOne(reqHeaders['X-Api-Key']);
  return got === expected;
}

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

/** PayUC / PayCore вебхуки */
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

  if (status === 'paid' && body.merchant_order_no) {
    return {
      orderId: String(body.merchant_order_no),
      amountRub: body.amount != null ? Math.round(Number(body.amount)) : undefined,
      providerId: String(body.payment_no || ''),
    };
  }

  return null;
}
