import { env } from './env.js';
import { createPlategaPayment } from './platega.js';
import { createLavatopPayment } from './lavatop.js';
import { createLavaInvoice } from './lava.js';

export interface PaymentRequest {
  orderId: string;
  amountRub: number;
  description: string;
  method?: 'sbp' | 'card';
}

export interface PaymentResult {
  redirect: string;
  providerId?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
}

class StubProvider implements PaymentProvider {
  readonly name = 'stub';
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    return { redirect: `${env.publicUrl}/pay-mock/${encodeURIComponent(req.orderId)}` };
  }
}

class PlategaProvider implements PaymentProvider {
  readonly name = 'platega';
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    const payMethod = req.method === 'card' ? 'card' : 'sbp';
    const res = await createPlategaPayment(req.orderId, req.amountRub, req.description, payMethod);
    return { redirect: res.redirect, providerId: res.transactionId || undefined };
  }
}

class LavaProvider implements PaymentProvider {
  readonly name = 'lava';
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    const res = await createLavaInvoice(req.orderId, req.amountRub, req.description);
    return { redirect: res.redirect, providerId: res.invoiceId || undefined };
  }
}

/** @deprecated PayUC / Lava Top */
class LavatopProvider implements PaymentProvider {
  readonly name = 'lavatop';
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    const res = await createLavatopPayment(req.orderId, req.amountRub, req.description);
    return { redirect: res.redirect, providerId: res.paymentNo || undefined };
  }
}

let provider: PaymentProvider | null = null;
export function getProvider(): PaymentProvider {
  if (provider) return provider;
  switch (env.paymentProvider) {
    case 'platega':
      provider = new PlategaProvider();
      break;
    case 'lava':
      provider = new LavaProvider();
      break;
    case 'lavatop':
      provider = new LavatopProvider();
      break;
    default:
      provider = new StubProvider();
  }
  return provider;
}
