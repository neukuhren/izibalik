/**
 * Проверка PayUC init (Lava Top). Запуск: npm run job:probe-payuc
 * Не создаёт реальный платёж — только диагностика ключа.
 */
import { env } from '../env.js';

async function main(): Promise<void> {
  if (!env.lavatopApiKey) {
    console.error('LAVATOP_API_KEY не задан');
    process.exit(1);
  }
  const orderId = `probe-${Date.now()}`;
  const body = {
    merchant_order_no: orderId,
    amount: 100,
    currency: 'RUB',
    item_name: 'probe',
    description: 'probe',
    success_url: `${env.publicUrl}/?paid=1`,
    cancel_url: `${env.publicUrl}/?paid=0`,
    payok_url: `${env.publicUrl}/api/webhooks/lavatop`,
  };
  const r = await fetch(env.lavatopInitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': env.lavatopApiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await r.text();
  console.log('URL:', env.lavatopInitUrl);
  console.log('HTTP:', r.status);
  console.log('Body:', text.slice(0, 500));
  process.exit(r.ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
