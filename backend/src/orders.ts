import { randomInt } from 'node:crypto';
import {
  insertOrder,
  getOrder,
  updateOrderStatus,
  updateOrderAdmin,
  listOrdersByUser,
  listAllOrders,
  listPaidOrdersWithFazer,
  listPendingOrders,
  now,
  type OrderRow,
} from './db.js';
import { getProduct, priceOf, discountFor, buyRub } from './catalog.js';
import { chargeAmountRub, serviceFeeRub, totalWithFeeRub } from './fees.js';
import { env } from './env.js';
import { getLavaInvoicePaidByOrderId } from './lava.js';
import { getConfig, markupOf, findPromo, bumpPromoUsed } from './config.js';
import {
  createFazerOrder,
  getFazerOrder,
  getRateRub,
  isFazerDeliveryComplete,
  validatePlayerId,
} from './fazer.js';
import { getProvider } from './payments.js';
import { notifyUser } from './notify.js';

export interface CreateOrderInput {
  userId: number | null;
  handle: string | null;
  productId: string;
  playerId: string;
  method: string;
  promoCode: string;
  quantity?: number;
}

export interface CreateOrderResult {
  ok: boolean;
  orderId?: string;
  redirect?: string;
  error?: string;
}

function newOrderId(): string {
  // IZ-XXXXX, проверка коллизии по БД.
  for (let i = 0; i < 10; i++) {
    const id = 'IZ-' + randomInt(10000, 99999);
    if (!getOrder.get(id)) return id;
  }
  return 'IZ-' + Date.now().toString(36).toUpperCase();
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const product = getProduct(input.productId);
  if (!product) return { ok: false, error: 'Товар не найден' };
  if (!/^\d{8,12}$/.test(input.playerId)) return { ok: false, error: 'Некорректный Player ID' };

  const cfg = getConfig();
  if (cfg.active[product.id] === false) return { ok: false, error: 'Товар недоступен' };

  const qty = Math.min(99, Math.max(1, Math.floor(Number(input.quantity) || 1)));
  const rate = await getRateRub();
  const markup = markupOf(cfg, product.id, product.defaultMarkup);
  const unitPrice = priceOf(product, markup, rate);
  const promo = findPromo(cfg, input.promoCode);
  const discount = discountFor(unitPrice * qty, promo);
  const subtotal = Math.max(1, unitPrice * qty - discount);
  const amount = chargeAmountRub(subtotal);
  const buy = buyRub(product, rate) * qty;

  const id = newOrderId();
  const ts = now();

  // Мягкая проверка ID у поставщика (не блокирует при недоступности).
  const check = await validatePlayerId(product.channel, product.offerId, input.playerId);
  if (check.valid === false) return { ok: false, error: 'Player ID не найден' };

  const method = input.method === 'card' ? 'card' : 'sbp';

  let redirect = '';
  let providerId: string | null = null;
  try {
    const pay = await getProvider().createPayment({
      orderId: id,
      amountRub: amount,
      description: `${qty > 1 ? qty + '× ' : ''}${product.name} — ${input.playerId}`,
      method,
    });
    redirect = pay.redirect;
    providerId = pay.providerId ?? null;
  } catch (e) {
    const msg = (e as Error).message || 'Платёжный провайдер недоступен';
    return { ok: false, error: msg };
  }

  insertOrder.run({
    id,
    user_id: input.userId,
    handle: input.handle,
    product_id: product.id,
    player_id: input.playerId,
    amount,
    buy,
    markup,
    promo: promo ? promo.code : null,
    method,
    status: 'pending',
    provider_id: providerId,
    fazer_id: null,
    redirect,
    created_at: ts,
    updated_at: ts,
    quantity: qty,
  });

  // Заглушка: авто-оплата через N мс для тестов сквозного сценария.
  if (env.paymentProvider === 'stub' && env.payStubAutopayMs > 0) {
    setTimeout(() => {
      void markOrderPaid(id).catch(() => {});
    }, env.payStubAutopayMs);
  }

  return { ok: true, orderId: id, redirect };
}

// Платёж подтверждён (webhook/заглушка) → оплачен, запускаем выдачу.
export async function markOrderPaid(orderId: string): Promise<void> {
  const o = getOrder.get(orderId) as OrderRow | undefined;
  if (!o) return;
  if (o.status !== 'pending') return;
  updateOrderStatus.run({
    id: orderId,
    status: 'paid',
    fazer_id: null,
    provider_id: o.provider_id,
    updated_at: now(),
  });
  if (o.promo) bumpPromoUsed(o.promo);
  if (o.user_id) void notifyUser(o.user_id, `✅ Оплата получена по заказу ${o.id}. Выдаём ${productName(o.product_id)}…`);
  await fulfillOrder(orderId);
}

function productName(id: string): string {
  return getProduct(id)?.name ?? id;
}

function orderDoneNotifyText(o: OrderRow): string {
  const product = getProduct(o.product_id);
  const qty = Math.max(1, Math.floor(Number(o.quantity) || 1));
  const label = product
    ? qty > 1
      ? `${qty}× ${product.name}`
      : product.name
    : productName(o.product_id);
  return `🎉 Заказ ${o.id} выполнен: ${label} зачислен на ID ${o.player_id}.`;
}

const FAZER_SYNC_DELAYS_SEC = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180];

/** После выдачи в Fazer статус часто processing 1–3 мин — дожимаем до done и шлём уведомление. */
function scheduleFazerStatusSync(orderId: string): void {
  void (async () => {
    for (const sec of FAZER_SYNC_DELAYS_SEC) {
      await new Promise((r) => setTimeout(r, sec * 1000));
      const cur = getOrder.get(orderId) as OrderRow | undefined;
      if (!cur || cur.status !== 'paid') return;
      await syncPaidOrderFromFazer(orderId, cur);
      const after = getOrder.get(orderId) as OrderRow | undefined;
      if (after?.status === 'done' || after?.status === 'fulfill_failed') return;
    }
  })();
}

async function syncPaidOrderFromFazer(orderId: string, o: OrderRow): Promise<OrderRow | undefined> {
  if (o.status !== 'paid' || !o.fazer_id) return o;
  const f = await getFazerOrder(o.fazer_id);
  if (!f) return o;
  if (isFazerDeliveryComplete(f)) {
    updateOrderStatus.run({
      id: orderId,
      status: 'done',
      fazer_id: f.fazerId,
      provider_id: null,
      updated_at: now(),
    });
    if (o.user_id) void notifyUser(o.user_id, orderDoneNotifyText(o));
    return getOrder.get(orderId) as OrderRow | undefined;
  }
  if (f.status === 'failed') {
    updateOrderStatus.run({
      id: orderId,
      status: 'fulfill_failed',
      fazer_id: f.fazerId,
      provider_id: null,
      updated_at: now(),
    });
    return getOrder.get(orderId) as OrderRow | undefined;
  }
  return o;
}

// Выдача через FazerCards. Идемпотентность по orderId.
export async function fulfillOrder(orderId: string): Promise<void> {
  const o = getOrder.get(orderId) as OrderRow | undefined;
  if (!o) return;
  if (o.status !== 'paid') return;
  const product = getProduct(o.product_id);
  if (!product) {
    updateOrderStatus.run({ id: orderId, status: 'fulfill_failed', fazer_id: null, provider_id: null, updated_at: now() });
    return;
  }
  const qty = Math.max(1, Math.floor(Number(o.quantity) || 1));
  try {
    let lastFazerId = '';
    let allDone = true;
    let anyFailed = false;
    let anyPending = false;
    for (let i = 0; i < qty; i++) {
      const key = qty === 1 ? o.id : `${o.id}#${i + 1}`;
      const f = await createFazerOrder(product.channel, product.offerId, o.player_id, key);
      lastFazerId = f.fazerId;
      if (f.status === 'failed') anyFailed = true;
      else if (f.status !== 'done') {
        anyPending = true;
        allDone = false;
      }
    }
    if (anyFailed) {
      updateOrderStatus.run({ id: orderId, status: 'fulfill_failed', fazer_id: lastFazerId, provider_id: null, updated_at: now() });
      if (o.user_id) void notifyUser(o.user_id, `⚠️ Не удалось выдать заказ ${o.id}. Средства вернём, поддержка свяжется.`);
    } else if (allDone && !anyPending) {
      updateOrderStatus.run({ id: orderId, status: 'done', fazer_id: lastFazerId, provider_id: null, updated_at: now() });
      if (o.user_id) void notifyUser(o.user_id, orderDoneNotifyText(o));
    } else {
      updateOrderStatus.run({ id: orderId, status: 'paid', fazer_id: lastFazerId, provider_id: null, updated_at: now() });
      scheduleFazerStatusSync(orderId);
    }
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error('[fulfillOrder]', orderId, msg);
    updateOrderStatus.run({
      id: orderId,
      status: 'fulfill_failed',
      fazer_id: null,
      provider_id: o.provider_id,
      updated_at: now(),
    });
    if (o.user_id) void notifyUser(o.user_id, `⚠️ Ошибка выдачи заказа ${o.id}. Поддержка свяжется с вами.`);
  }
}

export type AdminOrderAction = 'resolve' | 'refund' | 'resend';

/** Действия админа в карточке заказа — сохраняются в БД. */
export async function adminOrderAction(
  orderId: string,
  action: AdminOrderAction,
): Promise<{ ok: boolean; error?: string }> {
  const o = getOrder.get(orderId) as OrderRow | undefined;
  if (!o) return { ok: false, error: 'Заказ не найден' };

  if (action === 'resend') {
    if (o.status === 'fulfill_failed') return retryFulfillOrder(orderId);
    if (o.status === 'paid') {
      await refreshOrder(orderId);
      return { ok: true };
    }
    return { ok: false, error: `Повтор недоступен для статуса ${o.status}` };
  }

  if (action === 'refund') {
    if (o.admin_dismissed) return { ok: true };
    updateOrderAdmin.run({
      id: orderId,
      status: 'refunded',
      admin_dismissed: 1,
      fazer_id: o.fazer_id,
      provider_id: o.provider_id,
      updated_at: now(),
    });
    return { ok: true };
  }

  // resolve — закрыть инцидент в админке (скрывается из «Проблем» навсегда)
  if (o.admin_dismissed) return { ok: true };
  const next =
    o.status === 'pending' ? 'cancelled' : o.status === 'fulfill_failed' || o.status === 'paid' ? 'done' : 'done';
  updateOrderAdmin.run({
    id: orderId,
    status: next,
    admin_dismissed: 1,
    fazer_id: o.fazer_id,
    provider_id: o.provider_id,
    updated_at: now(),
  });
  return { ok: true };
}

/** Повтор выдачи после fulfill_failed (админ). Idempotency-Key = orderId у Fazer. */
export async function retryFulfillOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  const o = getOrder.get(orderId) as OrderRow | undefined;
  if (!o) return { ok: false, error: 'Заказ не найден' };
  if (o.status !== 'fulfill_failed') return { ok: false, error: `Статус: ${o.status}` };
  updateOrderStatus.run({ id: orderId, status: 'paid', fazer_id: null, provider_id: null, updated_at: now() });
  await fulfillOrder(orderId);
  const after = getOrder.get(orderId) as OrderRow | undefined;
  if (after?.status === 'fulfill_failed') return { ok: false, error: 'Выдача снова не удалась' };
  return { ok: true };
}

// Ленивое обновление статуса у поставщика (вызывается при опросе /api/order).
export async function refreshOrder(orderId: string): Promise<OrderRow | undefined> {
  const o = getOrder.get(orderId) as OrderRow | undefined;
  if (!o) return undefined;
  if (o.status === 'pending' && env.paymentProvider === 'lava') {
    try {
      const paid = await getLavaInvoicePaidByOrderId(o.id);
      if (paid) {
        await markOrderPaid(o.id);
        return getOrder.get(orderId) as OrderRow | undefined;
      }
    } catch (e) {
      console.warn('[refreshOrder] lava status', orderId, (e as Error).message);
    }
  }
  if (o.status === 'paid' && o.fazer_id) {
    const synced = await syncPaidOrderFromFazer(orderId, o);
    if (synced && synced.status !== o.status) return synced;
  }
  return o;
}

export interface RefreshPaidOrdersResult {
  checked: number;
  done: number;
  failed: number;
}

export interface RefreshPendingLavaResult {
  checked: number;
  paid: number;
}

/** Фоновая сверка: LAVA success, а у нас pending (вебхук не дошёл / пользователь закрыл мини-апп). */
export async function refreshPendingLavaOrders(): Promise<RefreshPendingLavaResult> {
  if (env.paymentProvider !== 'lava') return { checked: 0, paid: 0 };
  const ids = (listPendingOrders.all() as { id: string }[]).map((r) => r.id);
  let paid = 0;
  for (const id of ids) {
    try {
      const o = getOrder.get(id) as OrderRow | undefined;
      if (!o || o.status !== 'pending') continue;
      const lavaPaid = await getLavaInvoicePaidByOrderId(id);
      if (!lavaPaid) continue;
      await markOrderPaid(id);
      paid++;
    } catch (e) {
      console.warn('[refreshPendingLava]', id, (e as Error).message);
    }
  }
  return { checked: ids.length, paid };
}

/** Фоновая синхронизация: все заказы paid с fazer_id → done / fulfill_failed по API Fazer. */
export async function refreshAllPaidOrders(): Promise<RefreshPaidOrdersResult> {
  const ids = (listPaidOrdersWithFazer.all() as { id: string }[]).map((r) => r.id);
  let done = 0;
  let failed = 0;
  for (const id of ids) {
    const before = getOrder.get(id) as OrderRow | undefined;
    if (!before || before.status !== 'paid') continue;
    const after = await refreshOrder(id);
    if (!after || after.id !== id) continue;
    if (after.status === 'done') done++;
    else if (after.status === 'fulfill_failed') failed++;
  }
  return { checked: ids.length, done, failed };
}

// --- сериализация для фронта ---

export function toClientOrder(o: OrderRow) {
  return {
    id: o.id,
    playerId: o.player_id,
    productId: o.product_id,
    amount: o.amount,
    buy: o.buy,
    quantity: o.quantity ?? 1,
    status: o.status,
    createdAt: o.created_at,
  };
}

export { serviceFeeRub, totalWithFeeRub };

export function toAdminOrder(o: OrderRow) {
  return {
    ...toClientOrder(o),
    user: o.handle ?? (o.user_id ? 'id' + o.user_id : '—'),
    userId: o.user_id,
    dismissed: !!(o.admin_dismissed ?? 0),
  };
}

export async function myOrders(userId: number) {
  const rows = listOrdersByUser.all(userId) as unknown as OrderRow[];
  for (const o of rows) {
    if (o.status === 'paid' && o.fazer_id) await refreshOrder(o.id);
  }
  return (listOrdersByUser.all(userId) as unknown as OrderRow[]).map(toClientOrder);
}

export async function adminOrders() {
  const rows = listAllOrders.all() as unknown as OrderRow[];
  for (const o of rows) {
    if (o.status === 'paid' && o.fazer_id) await refreshOrder(o.id);
  }
  return (listAllOrders.all() as unknown as OrderRow[]).map(toAdminOrder);
}
