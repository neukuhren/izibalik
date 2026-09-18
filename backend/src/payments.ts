import { env } from './env.js';

// Абстракция платёжного провайдера (карта/СБП). Сейчас активна заглушка.
// Чтобы подключить реального провайдера (YooKassa/CryptoCloud/агрегатор):
//   1. реализовать PaymentProvider,
//   2. вернуть его из getProvider() по env.paymentProvider,
//   3. добавить webhook-роут, вызывающий markOrderPaid(orderId) после подтверждения.

export interface PaymentRequest {
  orderId: string;
  amountRub: number;
  description: string;
}

export interface PaymentResult {
  redirect: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
}

// Заглушка: redirect ведёт на страницу /pay-mock/:id самого бэкенда,
// где заказ можно пометить оплаченным вручную (или авто через PAY_STUB_AUTOPAY_MS).
class StubProvider implements PaymentProvider {
  readonly name = 'stub';
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    return { redirect: `${env.publicUrl}/pay-mock/${encodeURIComponent(req.orderId)}` };
  }
}

let provider: PaymentProvider | null = null;
export function getProvider(): PaymentProvider {
  if (provider) return provider;
  switch (env.paymentProvider) {
    // case 'yookassa': provider = new YooKassaProvider(); break;
    // case 'cryptocloud': provider = new CryptoCloudProvider(); break;
    default:
      provider = new StubProvider();
  }
  return provider;
}
