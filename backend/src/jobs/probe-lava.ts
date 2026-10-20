import { createLavaInvoice, lavaConfigured } from '../lava.js';

async function main(): Promise<void> {
  if (!lavaConfigured()) {
    console.error('LAVA_SHOP_ID / LAVA_SECRET_KEY не заданы');
    process.exit(1);
  }
  const orderId = `probe-${Date.now()}`;
  try {
    const res = await createLavaInvoice(orderId, 100, 'probe');
    console.log('OK invoice', res.invoiceId);
    console.log('URL', res.redirect);
    process.exit(0);
  } catch (e) {
    console.error('FAIL', e instanceof Error ? e.message : e);
    process.exit(2);
  }
}

main();
