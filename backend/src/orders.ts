import { randomInt } from 'node:crypto';
import {
  insertOrder,
  getOrder,
  updateOrderStatus,
  listOrdersByUser,
  listAllOrders,
  listPaidOrdersWithFazer,
  now,
  type OrderRow,
} from './db.js';
import { getProduct, priceOf, discountFor } from './catalog.js';
import { getConfig, markupOf, findPromo, bumpPromoUsed } from './config.js';
import { createFazerOrder, getFazerOrder, validatePlayerId } from './fazer.js';
import { getProvider } from './payments.js';
import { env } from './env.js';
import { notifyUser } from './notify.js';

export interface CreateOrderInput {
  userId: number | null;
  handle: string | null;
  productId: string;
  playerId: string;
  method: string;
  promoCode: string;
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

  const markup = markupOf(cfg, product.id, product.defaultMarkup);
  const price = priceOf(product, markup);
  const promo = findPromo(cfg, input.promoCode);
  const discount = discountFor(price, promo);
  const amount = Math.max(1, price - discount);
  const buy = Math.round(product.buyUsd * env.fallbackRate);

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
      description: `${product.name} — ${input.playerId}`,
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
  updateOrderStatus.run({ id: orderId, status: 'paid', fazer_id: null, provider_id: null, updated_at: now() });
  if (o.promo) bumpPromoUsed(o.promo);
  if (o.user_id) void notifyUser(o.user_id, `✅ Оплата получена по заказу ${o.id}. Выдаём ${productName(o.product_id)}…`);
  await fulfillOrder(orderId);
}

function productName(id: string): string {
  return getProduct(id)?.name ?? id;
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
  try {
    const f = await createFazerOrder(product.channel, product.offerId, o.player_id, o.id);
    if (f.status === 'done') {
      updateOrderStatus.run({ id: orderId, status: 'done', fazer_id: f.fazerId, provider_id: null, updated_at: now() });
      if (o.user_id) void notifyUser(o.user_id, `🎉 Заказ ${o.id} выполнен: ${product.name} зачислен на ID ${o.player_id}.`);
    } else if (f.status === 'failed') {
      updateOrderStatus.run({ id: orderId, status: 'fulfill_failed', fazer_id: f.fazerId, provider_id: null, updated_at: now() });
      if (o.user_id) void notifyUser(o.user_id, `⚠️ Не удалось выдать заказ ${o.id}. Средства вернём, поддержка свяжется.`);
    } else {
      // pending/processing у поставщика — оставляем 'paid', дозабор при опросе.
      updateOrderStatus.run({ id: orderId, status: 'paid', fazer_id: f.fazerId, provider_id: null, updated_at: now() });
    }
  } catch (e) {
    console.error('[fulfillOrder]', orderId, (e as Error).message);
    updateOrderStatus.run({ id: orderId, status: 'fulfill_failed', fazer_id: null, provider_id: null, updated_at: now() });
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
    if (o.status === 'refunded' || o.status === 'cancelled') return { ok: true };
    updateOrderStatus.run({
      id: orderId,
      status: 'refunded',
      fazer_id: o.fazer_id,
      provider_id: o.provider_id,
      updated_at: now(),
    });
    return { ok: true };
  }

  // resolve — закрыть инцидент: неоплаченный → cancelled, ошибка выдачи → done вручную
  if (o.status === 'done' || o.status === 'cancelled') return { ok: true };
  const next =
    o.status === 'pending' ? 'cancelled' : o.status === 'fulfill_failed' || o.status === 'paid' ? 'done' : 'done';
  updateOrderStatus.run({
    id: orderId,
    status: next,
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
  if (o.status === 'paid' && o.fazer_id) {
    const f = await getFazerOrder(o.fazer_id);
    if (f && f.status === 'done') {
      updateOrderStatus.run({ id: orderId, status: 'done', fazer_id: f.fazerId, provider_id: null, updated_at: now() });
      if (o.user_id) void notifyUser(o.user_id, `🎉 Заказ ${o.id} выполнен.`);
      return getOrder.get(orderId) as unknown as OrderRow;
    }
    if (f && f.status === 'failed') {
      updateOrderStatus.run({ id: orderId, status: 'fulfill_failed', fazer_id: f.fazerId, provider_id: null, updated_at: now() });
      return getOrder.get(orderId) as unknown as OrderRow;
    }
  }
  return o;
}

export interface RefreshPaidOrdersResult {
  checked: number;
  done: number;
  failed: number;
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
    status: o.status,
    createdAt: o.created_at,
  };
}

export function toAdminOrder(o: OrderRow) {
  return {
    ...toClientOrder(o),
    user: o.handle ?? (o.user_id ? 'id' + o.user_id : '—'),
    userId: o.user_id,
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
