import { env } from './env.js';
import { createPlategaPayment } from './platega.js';

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

let provider: PaymentProvider | null = null;
export function getProvider(): PaymentProvider {
  if (provider) return provider;
  switch (env.paymentProvider) {
    case 'platega':
      provider = new PlategaProvider();
      break;
    default:
      provider = new StubProvider();
  }
  return provider;
}
