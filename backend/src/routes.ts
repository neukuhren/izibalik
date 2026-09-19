import type { FastifyInstance } from 'fastify';
import { env, isAdmin } from './env.js';
import { userFromInit, displayHandle } from './telegram.js';
import { upsertUser, now, getOrder, getOrderByProviderId, type OrderRow } from './db.js';
import { getConfig, saveConfig, type ShopConfig } from './config.js';
import { getBalanceUsd, getRateRub, createCryptoInvoice } from './fazer.js';
import { verifyPlategaCallback, type PlategaCallbackBody } from './platega.js';
import {
  createOrder,
  refreshOrder,
  markOrderPaid,
  myOrders,
  adminOrders,
  retryFulfillOrder,
  toClientOrder,
} from './orders.js';
import { audienceCounts, startBroadcast, broadcastStatus, type Audience } from './broadcast.js';

interface InitBody {
  initData?: string;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // --- Конфиг магазина (наценки/активность/промо) ---
  app.get('/api/config', async () => ({ ok: true, config: getConfig() }));

  app.post('/api/config', async (req, reply) => {
    const body = req.body as InitBody & { config?: Partial<ShopConfig> };
    const user = userFromInit(body.initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    if (!body.config) return reply.code(400).send({ ok: false, error: 'no config' });
    const saved = saveConfig(body.config);
    return { ok: true, config: saved };
  });

  // --- Баланс поставщика + курс ---
  app.get('/api/balance', async () => {
    const [balance, rate] = await Promise.all([getBalanceUsd(), getRateRub()]);
    if (balance == null) return { ok: false };
    return { ok: true, balance_usd: balance, rate_rub: rate };
  });

  // --- Регистрация пользователя (аудитория рассылки) ---
  app.post('/api/seen', async (req, reply) => {
    const user = userFromInit((req.body as InitBody).initData);
    if (!user) return reply.code(401).send({ ok: false });
    upsertUser.run({
      id: user.id,
      handle: displayHandle(user),
      name: [user.first_name, user.last_name].filter(Boolean).join(' '),
      username: user.username ?? null,
      ts: now(),
    });
    return { ok: true };
  });

  // --- Заказы пользователя ---
  app.post('/api/my-orders', async (req, reply) => {
    const user = userFromInit((req.body as InitBody).initData);
    if (!user) return reply.code(401).send({ ok: false });
    return { ok: true, orders: myOrders(user.id) };
  });

  // --- Заказы (админка) ---
  app.post('/api/orders', async (req, reply) => {
    const user = userFromInit((req.body as InitBody).initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    return { ok: true, orders: adminOrders() };
  });

  app.post('/api/orders/retry', async (req, reply) => {
    const body = req.body as InitBody & { orderId?: string };
    const user = userFromInit(body.initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    const orderId = String(body.orderId || '').trim();
    if (!orderId) return reply.code(400).send({ ok: false, error: 'orderId required' });
    const res = await retryFulfillOrder(orderId);
    if (!res.ok) return reply.send({ ok: false, error: res.error });
    const o = getOrder.get(orderId) as OrderRow | undefined;
    return { ok: true, order: o ? toClientOrder(o) : null };
  });

  // --- Создать платёж/заказ ---
  app.post('/api/pay', async (req, reply) => {
    const body = req.body as InitBody & {
      productId?: string;
      playerId?: string;
      method?: string;
      promo?: string;
    };
    const user = userFromInit(body.initData);
    if (!user) return reply.code(401).send({ ok: false, error: 'Требуется Telegram' });
    if (!body.productId || !body.playerId) return reply.code(400).send({ ok: false, error: 'Не хватает данных' });

    upsertUser.run({
      id: user.id,
      handle: displayHandle(user),
      name: [user.first_name, user.last_name].filter(Boolean).join(' '),
      username: user.username ?? null,
      ts: now(),
    });

    const res = await createOrder({
      userId: user.id,
      handle: displayHandle(user),
      productId: body.productId,
      playerId: body.playerId,
      method: body.method ?? 'sbp',
      promoCode: body.promo ?? '',
    });
    if (!res.ok) return reply.send({ ok: false, error: res.error });
    return { ok: true, orderId: res.orderId, redirect: res.redirect };
  });

  // --- Статус заказа (опрос) ---
  app.get('/api/order', async (req, reply) => {
    const id = (req.query as { id?: string }).id;
    if (!id) return reply.code(400).send({ ok: false });
    const o = await refreshOrder(id);
    if (!o) return reply.code(404).send({ ok: false });
    return { ok: true, order: toClientOrder(o) };
  });

  // --- Пополнение баланса поставщика (крипто-инвойс, админ) ---
  app.post('/api/topup', async (req, reply) => {
    const body = req.body as InitBody & { method?: string; amount?: number };
    const user = userFromInit(body.initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    const amount = Number(body.amount);
    if (!(amount >= 10)) return reply.send({ ok: false, error: 'Минимальная сумма — $10' });
    try {
      const inv = await createCryptoInvoice(body.method ?? 'trc20', amount);
      if (!inv.address) return reply.send({ ok: false, error: 'Поставщик не вернул адрес' });
      return { ok: true, payment: { address: inv.address, amount: inv.amount, currency: inv.currency, network: inv.network } };
    } catch (e) {
      return reply.send({ ok: false, error: (e as Error).message || 'Не удалось создать счёт' });
    }
  });

  // --- Рассылка: аудитории ---
  app.post('/api/broadcast/audiences', async (req, reply) => {
    const user = userFromInit((req.body as InitBody).initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    return { ok: true, counts: audienceCounts() };
  });

  // --- Рассылка: старт ---
  app.post('/api/broadcast', async (req, reply) => {
    const body = req.body as InitBody & {
      text?: string;
      audience?: Audience;
      button?: { text: string; url: string } | null;
    };
    const user = userFromInit(body.initData);
    if (!isAdmin(user?.id)) return reply.code(403).send({ ok: false, error: 'forbidden' });
    const text = (body.text ?? '').trim();
    if (!text) return reply.send({ ok: false, error: 'Пустой текст' });
    const res = startBroadcast(text, body.audience ?? 'all', body.button ?? null);
    if (!res.ok) return reply.send({ ok: false, error: res.error });
    return { ok: true, total: res.total };
  });

  // --- Рассылка: статус ---
  app.get('/api/broadcast/status', async () => ({ ok: true, ...broadcastStatus() }));

  // --- Заглушка оплаты (только при PAYMENT_PROVIDER=stub) ---
  app.get('/pay-mock/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const o = getOrder.get(id) as OrderRow | undefined;
    reply.type('text/html; charset=utf-8');
    if (!o) return '<h2>Заказ не найден</h2>';
    if (o.status !== 'pending') return `<h2>Заказ ${id}: ${o.status}</h2><p>Можно закрыть окно.</p>`;
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Оплата ${id}</title>
<div style="font-family:system-ui;max-width:420px;margin:40px auto;padding:24px;text-align:center">
  <h2>Заглушка оплаты</h2>
  <p>Заказ <b>${id}</b> на сумму <b>${o.amount} ₽</b></p>
  <form method="post" action="/pay-mock/${encodeURIComponent(id)}/confirm">
    <button style="font-size:18px;padding:14px 28px;border:0;border-radius:12px;background:#7b2fff;color:#fff;cursor:pointer">Оплатить (тест)</button>
  </form>
  <p style="color:#888;font-size:13px;margin-top:16px">Замените на реального провайдера в src/payments.ts</p>
</div>`;
  });

  app.post('/pay-mock/:id/confirm', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    await markOrderPaid(id);
    reply.type('text/html; charset=utf-8');
    return `<!doctype html><meta charset="utf-8"><title>Оплачено</title>
<div style="font-family:system-ui;max-width:420px;margin:40px auto;text-align:center">
  <h2>✅ Оплачено</h2><p>Заказ ${id} оплачен. Вернитесь в Telegram — выдача идёт.</p>
</div>`;
  });

  // --- Platega: callback (Настройки → Callback URLs в ЛК) ---
  app.post('/api/webhooks/platega', async (req, reply) => {
    if (!verifyPlategaCallback(req.headers as Record<string, string | string[] | undefined>)) {
      return reply.code(401).send({ ok: false });
    }
    const body = req.body as PlategaCallbackBody;
    const status = String(body.status || '').toUpperCase();
    let orderId = String(body.payload || '').trim();
    if (!orderId && body.id) {
      const row = getOrderByProviderId.get(String(body.id)) as OrderRow | undefined;
      if (row) orderId = row.id;
    }
    if (!orderId) return reply.send({ ok: true });

    if (status === 'CONFIRMED') {
      const o = getOrder.get(orderId) as OrderRow | undefined;
      if (o && body.amount != null && Math.round(body.amount) !== o.amount) {
        req.log.warn({ orderId, amount: body.amount, expected: o.amount }, 'platega amount mismatch');
      }
      await markOrderPaid(orderId);
    }
    return reply.send({ ok: true });
  });

  // --- Health ---
  app.get('/api/health', async () => ({ ok: true, ts: now() }));
}
