import { env } from './env.js';

const BASE = env.plategaBase.replace(/\/$/, '');

export interface PlategaCreateResult {
  transactionId: string;
  redirect: string;
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-MerchantId': env.plategaMerchantId,
    'X-Secret': env.plategaSecret,
  };
}

async function parseJson(r: Response): Promise<any> {
  const text = await r.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Platega: неверный JSON (${r.status})`);
  }
}

/** СБП — paymentMethod 2; карта — v2 (выбор метода на стороне Platega). */
export async function createPlategaPayment(
  orderId: string,
  amountRub: number,
  description: string,
  payMethod: 'sbp' | 'card',
): Promise<PlategaCreateResult> {
  if (!env.plategaMerchantId || !env.plategaSecret) {
    throw new Error('Platega не настроена (merchant/secret)');
  }

  const returnUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=1`;
  const failedUrl = `${env.publicUrl}/?order=${encodeURIComponent(orderId)}&paid=0`;

  let r: Response;
  if (payMethod === 'sbp') {
    r = await fetch(`${BASE}/transaction/process`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        paymentMethod: env.plategaMethodSbp,
        paymentDetails: { amount: amountRub, currency: 'RUB' },
        description,
        return: returnUrl,
        failedUrl,
        payload: orderId,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } else {
    r = await fetch(`${BASE}/v2/transaction/process`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        paymentDetails: { amount: amountRub, currency: 'RUB' },
        description,
        return: returnUrl,
        failedUrl,
        payload: orderId,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  }

  const data = await parseJson(r);
  if (!r.ok) {
    const msg = data?.message || data?.error || data?.title || `HTTP ${r.status}`;
    throw new Error(String(msg));
  }

  const transactionId = String(data.transactionId || data.id || '');
  const redirect = String(data.redirect || data.url || '');
  if (!redirect) throw new Error('Platega не вернула redirect');
  return { transactionId, redirect };
}

export interface PlategaCallbackBody {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paymentMethod?: number;
  payload?: string;
}

export function verifyPlategaCallback(reqHeaders: Record<string, string | string[] | undefined>): boolean {
  const mid = headerOne(reqHeaders['x-merchantid']);
  const sec = headerOne(reqHeaders['x-secret']);
  if (!mid || !sec) return false;
  return mid === env.plategaMerchantId && sec === env.plategaSecret;
}

function headerOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}
