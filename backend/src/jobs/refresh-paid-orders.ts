import { refreshAllPaidOrders, refreshPendingLavaOrders } from '../orders.js';

async function main(): Promise<void> {
  const lava = await refreshPendingLavaOrders();
  const result = await refreshAllPaidOrders();
  console.log(
    JSON.stringify({
      job: 'refresh-paid-orders',
      ok: true,
      lava,
      ...result,
      at: new Date().toISOString(),
    }),
  );
}

main().catch((e) => {
  console.error('[refresh-paid-orders]', (e as Error).message || e);
  process.exit(1);
});
