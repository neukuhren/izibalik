// @ts-nocheck
// Логика витрины и админки.
import { Logic } from './base';
import { getTgUser, getInitData } from '../telegram';
import { openPaymentUrl } from '../utils/openPaymentUrl';

// товары с растровыми артами; остальные — SVG-плейсхолдеры до дизайнера
const PNG_ART = new Set(['p60', 'p325', 'p660', 'p1800', 'p3850', 'p8100', 'nc300', 'nc1580', 'nc3850', 'nc10230', 'nc16800', 'nc35000']);

// Whitelist Telegram ID с доступом к админ-панели. Остальным вход закрыт.
// ВНИМАНИЕ: клиентский гейт (скрытие UI). При появлении бекенда админ-действия
// обязаны проверяться на сервере по этому же списку — фронт легко обойти.
const ADMIN_IDS = [1239066805, 1606026306];
const isAdminUser = () => { const u = getTgUser(); return !!u && ADMIN_IDS.includes(u.id); };

const PIDS_KEY = 'izi_pids';
const SERVICE_FEE_PCT = 8;
const loadPids = () => {
  try { const v = JSON.parse(localStorage.getItem(PIDS_KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; }
  catch (e) { return []; }
};

export class PrototypeLogic extends Logic {
  constructor(props) {
    super(props);
    this.timers = [];
    // Каталог PUBG из FazerCards (GET /topups/offers). buyUsd — закупка у поставщика.
    // Канал поставки: pubg_mobile_auto (осн.) / pubg_new_state; fast/manual/reserve — резерв для бекенда.
    // Курс и цены зафиксированы статически до бекенда (курс из /steam-topup/rates, 2026-07-02).
    const RUB = 78.07; // fallback до загрузки /api/catalog
    const VI_G = 'linear-gradient(135deg,#7b2fff,#4a1a99)';
    const VM_G = 'linear-gradient(135deg,#7b2fff,#ff00aa)';
    const CY_G = 'linear-gradient(135deg,#00f0ff,#7b2fff)';
    const MG_G = 'linear-gradient(135deg,#ff00aa,#8a0a4a)';
    // [game, sub, id, offerId, name, buyUsd, extra]
    const RAW = [
      ['pubgm', 'uc', 'p60', '60_uc', '60 UC', 0.8904, { uc: 60, old: 109, markup: 25 }],
      ['pubgm', 'uc', 'p325', '325_uc', '325 UC', 4.5135, { uc: 325, old: 519, badge: 'ПОПУЛЯРНЫЙ' }],
      ['pubgm', 'uc', 'p660', '660_uc', '660 UC', 8.9306, { uc: 660, old: 999 }],
      ['pubgm', 'uc', 'p1800', '1800_uc', '1800 UC', 22.3352, { uc: 1800, old: 2590, badge: 'ВЫГОДНО' }],
      ['pubgm', 'uc', 'p3850', '3850_uc', '3850 UC', 44.4752, { uc: 3850, old: 5290 }],
      ['pubgm', 'uc', 'p8100', '8100_uc', '8100 UC', 88.66, { uc: 8100, old: 10490 }],
      ['pubgm', 'prime', 'pr1', 'prime_1_month', 'Прайм · 1 мес', 0.8866, { icon: 'P', iconBg: VI_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'pr3', 'prime_3_months', 'Прайм · 3 мес', 2.6598, { icon: 'P', iconBg: VI_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'pr6', 'prime_6_months', 'Прайм · 6 мес', 5.3196, { icon: 'P', iconBg: VI_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'pr12', 'prime_12_months', 'Прайм · 12 мес', 10.6392, { icon: 'P', iconBg: VI_G, iconC: '#fff', badge: 'ВЫГОДНО' }],
      ['pubgm', 'prime', 'prp1', 'prime_plus_1_month', 'Прайм Плюс · 1 мес', 8.866, { icon: 'P+', iconBg: VM_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'prp3', 'prime_plus_3_months', 'Прайм Плюс · 3 мес', 26.598, { icon: 'P+', iconBg: VM_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'prp6', 'prime_plus_6_months', 'Прайм Плюс · 6 мес', 52.39, { icon: 'P+', iconBg: VM_G, iconC: '#fff' }],
      ['pubgm', 'prime', 'prp12', 'prime_plus_12_months', 'Прайм Плюс · 12 мес', 105.7875, { icon: 'P+', iconBg: VM_G, iconC: '#fff', badge: 'ВЫГОДНО' }],
      ['pubgm', 'mythic', 'wme', 'weekly_mythic_emblem_value_pack', 'Мифические кристаллы · Weekly', 2.6447, { icon: '◆', iconBg: VM_G, iconC: '#fff', badge: 'ХИТ' }],
      ['pubgm', 'mythic', 'mep', 'mythic_emblem_pack', 'Мифические кристаллы · Pack', 4.4219, { icon: '◆', iconBg: CY_G, iconC: '#04202b' }],
      ['pubgm', 'other', 'ep50', 'elite_pass_lv1_50', 'Elite Pass · LV1–50', 5.3398, { icon: 'EP', iconBg: MG_G, iconC: '#fff' }],
      ['pubgm', 'other', 'ep100', 'elite_pass_lv1_100', 'Elite Pass · LV1–100', 10.7722, { icon: 'EP', iconBg: MG_G, iconC: '#fff' }],
      ['pubgm', 'other', 'epp100', 'elite_pass_plus_lv1_100', 'Elite Pass Plus · LV1–100', 25.9018, { icon: 'EP+', iconBg: VM_G, iconC: '#fff', badge: 'MAX' }],
      ['pubgm', 'other', 'fpp', 'first_purchase_pack', 'First Purchase Pack', 0.8866, { icon: 'FP', iconBg: CY_G, iconC: '#04202b' }],
      ['pubgm', 'other', 'wd1', 'weekly_deal_pack_1', 'Weekly Deal · Pack 1', 0.8775, { icon: 'W1', iconBg: VI_G, iconC: '#fff' }],
      ['pubgm', 'other', 'wd2', 'weekly_deal_pack_2', 'Weekly Deal · Pack 2', 2.6447, { icon: 'W2', iconBg: VI_G, iconC: '#fff' }],
      ['pubgm', 'other', 'ufm', 'upgradable_firearm_materials_pack', 'Материалы оружия · Pack', 2.6558, { icon: '⚙', iconBg: MG_G, iconC: '#fff' }],
      ['newstate', 'nc', 'nc300', '300_nc', '300 NC', 0.9874, { uc: 300, unit: 'NC' }],
      ['newstate', 'nc', 'nc1580', '1580_nc', '1580 NC', 4.9368, { uc: 1580, unit: 'NC', badge: 'ПОПУЛЯРНЫЙ' }],
      ['newstate', 'nc', 'nc3850', '3850_nc', '3850 NC', 11.8482, { uc: 3850, unit: 'NC' }],
      ['newstate', 'nc', 'nc10230', '10230_nc', '10230 NC', 30.6078, { uc: 10230, unit: 'NC', badge: 'ВЫГОДНО' }],
      ['newstate', 'nc', 'nc16800', '16800_nc', '16800 NC', 49.3675, { uc: 16800, unit: 'NC' }],
      ['newstate', 'nc', 'nc35000', '35000_nc', '35000 NC', 98.735, { uc: 35000, unit: 'NC' }]
    ];
    const P = RAW.map(([game, sub, id, offerId, name, buyUsd, x = {}]) => {
      const usd = Number(buyUsd);
      const buy = Math.round(usd * RUB);
      const markup = x.markup || 22;
      return {
        id, game, sub, offerId, name, buyUsd: usd, buy, markup,
        channel: game === 'newstate' ? 'pubg_new_state' : 'pubg_mobile_auto',
        img: '/products/' + id + (PNG_ART.has(id) ? '.webp' : '.svg'),
        uc: x.uc || 0, unit: x.unit || 'UC',
        old: x.old || Math.max(Math.round(buy * (1 + markup / 100) * 1.3), Math.round(buy * (1 + markup / 100)) + 10),
        badge: x.badge || '', active: true,
        icon: x.icon, iconBg: x.iconBg, iconC: x.iconC
      };
    });
    // Реальных заказов/выручки/клиентов ещё нет — до подключения бекенда пусто.
    this.defaultProducts = P;
    this.state = {
      mode: 'client', screen: 'shop', tab: 'shop', game: 'pubgm', shopCat: 'uc',
      booting: true, bootP: 0, bootOp: 1, bootLine: 'инициализация…',
      products: P, adminOrders: [], myOrders: [],
      supBalUsd: null, supRate: null, savedCfg: '', cfgSaving: false, topup: null,
      selProduct: 'p325', playerId: loadPids()[0] || '', savedIds: loadPids(), copiedPid: '', nickname: '', pidError: '', pidShake: false, showHint: false, docUrl: '', docTitle: '',
      promo: '', promoState: 'idle', promoShake: false, appliedPromo: null,
      payMethod: 'sbp', payProgress: 0, stage: -1, success: false, curOrderId: '',
      orderFilter: 'all', bulkMarkup: 22,
      adminTab: 'dash', revPeriod: 'week', admSel: null, admSearch: '', admFilter: 'issues', admToast: '',
      promos: [],
      npCode: '', npKind: 'pct', npVal: '10', npLimit: '100', npErr: false,
      bcText: '', bcAudience: 'all', bcBtnText: '', bcBtnUrl: '', bcCounts: null, bcStatus: null, bcErr: '',
      bcImageId: '', bcImageName: '', bcUploading: false,
      cartQty: {}, orderQty: 1, feePct: SERVICE_FEE_PCT
    };
  }
  componentDidMount() {
    const s = this.state;
    const have = new Set((s.products || []).map(p => p.id));
    const missing = this.defaultProducts.filter(p => !have.has(p.id));
    if (missing.length) this.setState({ products: [...s.products, ...missing] });
    if (s.booting || s.booting === undefined) { this.setState({ booting: true, bootP: 0, bootOp: 1 }); this.runBoot(); }
    // реальный баланс поставщика через серверный эндпоинт (ключ на сервере)
    fetch('/api/balance').then(r => r.ok ? r.json() : null).then(d => {
      if (d && d.ok) this.setState({ supBalUsd: Number(d.balance_usd), supRate: Number(d.rate_rub) });
    }).catch(() => {});
    this.loadCatalog();
    this.catalogInt = setInterval(() => this.loadCatalog(), 60 * 60 * 1000);
    // регистрация пользователя для аудитории рассылки (по подписанному initData)
    if (getInitData()) {
      fetch('/api/seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: getInitData() }) }).catch(() => {});
      this.loadMyOrders();
    }
    // конфиг цен/наценок/промо с сервера (общий для всех клиентов)
    fetch('/api/config').then(r => r.ok ? r.json() : null).then(d => {
      if (d && d.ok) this.applyConfig(d.config || {}, true);
      else this.setState({ savedCfg: this.cfgStr(this.buildConfig()) });
    }).catch(() => this.setState({ savedCfg: this.cfgStr(this.buildConfig()) }));
    // возобновление опроса статуса при перезапуске мини-аппа
    if ((s.screen === 'paywait' || (s.screen === 'status' && !s.success)) && s.curOrderId) {
      this.pollOrder(s.curOrderId);
    } else if (s.screen === 'paywait') {
      this.setState({ screen: 'payment' });
    }
  }
  componentWillUnmount() { this.timers.forEach(clearTimeout); clearInterval(this.payInt); clearInterval(this.bootInt); clearInterval(this.orderInt); clearInterval(this.bcInt); clearInterval(this.catalogInt); }
  runBoot() {
    const lines = [[0, 'подключение к Telegram WebApp…'], [28, 'авторизация initData…'], [52, 'загрузка тарифов…'], [78, 'синхронизация заказов…'], [95, 'готово']];
    this.bootStart = Date.now();
    clearInterval(this.bootInt);
    this.bootInt = setInterval(() => {
      const p = Math.min(100, (Date.now() - this.bootStart) / 1700 * 100);
      const line = lines.filter(l => p >= l[0]).pop()[1];
      this.setState({ bootP: p, bootLine: line });
      if (p >= 100) {
        clearInterval(this.bootInt);
        this.setState({ bootOp: 0 });
        this.later(() => this.setState({ booting: false }), 420);
      }
    }, 40);
  }
  skipBoot() {
    clearInterval(this.bootInt);
    this.setState({ bootOp: 0 });
    this.later(() => this.setState({ booting: false }), 200);
  }
  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  // сериализация текущего конфига (наценки/активность/общая наценка/промо)
  buildConfig(s = this.state) {
    const markups = {}, active = {};
    s.products.forEach(p => { markups[p.id] = p.markup; active[p.id] = p.active; });
    return { markups, active, bulkMarkup: s.bulkMarkup, promos: s.promos };
  }
  cfgStr(cfg) { return JSON.stringify(cfg); }
  // применить конфиг с сервера к товарам/промо; fromServer=true → это база «сохранённого»
  applyConfig(cfg, fromServer) {
    const products = this.state.products.map(p => ({
      ...p,
      markup: (cfg.markups && cfg.markups[p.id] != null) ? cfg.markups[p.id] : p.markup,
      active: (cfg.active && cfg.active[p.id] != null) ? cfg.active[p.id] : p.active
    }));
    const bulkMarkup = cfg.bulkMarkup != null ? cfg.bulkMarkup : this.state.bulkMarkup;
    const promos = Array.isArray(cfg.promos) ? cfg.promos : this.state.promos;
    const patch = { products, bulkMarkup, promos };
    // базовый setState без callback — savedCfg ставим в том же патче
    if (fromServer) patch.savedCfg = this.cfgStr(this.buildConfig({ products, bulkMarkup, promos }));
    this.setState(patch);
  }
  saveConfig() {
    if (!getTgUser()) return;
    this.setState({ cfgSaving: true });
    const cfg = this.buildConfig();
    fetch('/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), config: cfg })
    }).then(r => r.json()).then(d => {
      if (d && d.ok) this.setState({ savedCfg: this.cfgStr(cfg), cfgSaving: false });
      else this.setState({ cfgSaving: false });
    }).catch(() => this.setState({ cfgSaving: false }));
  }
  cancelConfig() {
    try { this.applyConfig(JSON.parse(this.state.savedCfg || '{}'), false); } catch (e) {}
  }
  // рассылка
  loadAudiences() {
    if (!isAdminUser()) return;
    fetch('/api/broadcast/audiences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: getInitData() }) })
      .then(r => r.json()).then(d => { if (d && d.ok) this.setState({ bcCounts: d.counts }); }).catch(() => {});
  }
  sendBroadcast() {
    const s = this.state;
    const text = (s.bcText || '').trim();
    if (!text) { this.setState({ bcErr: 'Введите текст сообщения' }); return; }
    if (s.bcStatus && s.bcStatus.running) return;
    this.setState({ bcErr: '' });
    const button = (s.bcBtnText && s.bcBtnUrl) ? { text: s.bcBtnText, url: s.bcBtnUrl } : null;
    const imageId = (s.bcImageId || '').trim() || null;
    fetch('/api/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: getInitData(), text, audience: s.bcAudience, button, imageId }) })
      .then(r => r.json()).then(d => {
        if (d && d.ok) { this.setState({ bcStatus: { running: true, total: d.total, sent: 0, failed: 0 } }); this.pollBcast(); }
        else this.setState({ bcErr: (d && d.error) ? String(d.error) : 'Ошибка отправки' });
      }).catch(() => this.setState({ bcErr: 'Сеть недоступна' }));
  }
  uploadBcImage(file) {
    if (!file || !isAdminUser()) return;
    if (file.size > 10 * 1024 * 1024) { this.setState({ bcErr: 'Максимум 10 МБ' }); return; }
    this.setState({ bcUploading: true, bcErr: '' });
    const fd = new FormData();
    fd.append('initData', getInitData());
    fd.append('image', file);
    fetch('/api/broadcast/upload', { method: 'POST', body: fd })
      .then(r => r.json()).then(d => {
        if (d && d.ok) this.setState({ bcImageId: d.imageId, bcImageName: file.name || 'image', bcUploading: false });
        else this.setState({ bcUploading: false, bcErr: (d && d.error) ? String(d.error) : 'Не удалось загрузить' });
      }).catch(() => this.setState({ bcUploading: false, bcErr: 'Сеть недоступна' }));
  }
  clearBcImage() { this.setState({ bcImageId: '', bcImageName: '' }); }
  pollBcast() {
    clearInterval(this.bcInt);
    this.bcInt = setInterval(() => {
      fetch('/api/broadcast/status').then(r => r.json()).then(d => {
        if (d && d.ok) { this.setState({ bcStatus: d }); if (!d.running) clearInterval(this.bcInt); }
      }).catch(() => {});
    }, 1500);
  }
  // заказы текущего пользователя — с сервера
  loadMyOrders() {
    if (!getInitData()) return;
    fetch('/api/my-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ initData: getInitData() }) })
      .then(r => r.json()).then(d => {
        if (!d || !d.ok) return;
        const map = {
          done: 'done', pending: 'pending', paid: 'processing', fulfill_failed: 'failed',
          cancelled: 'cancelled', refunded: 'refund',
        };
        const orders = (d.orders || []).map(o => ({
          id: o.id, pid: o.playerId, productId: o.productId, amount: o.amount,
          buy: o.buy || 0, status: map[o.status] || o.status, ts: (o.createdAt || 0) * 1000
        }));
        const extra = this.state.myOrders.filter(x => !orders.some(o => o.id === x.id));
        this.setState({ myOrders: [...orders, ...extra].sort((a, b) => b.ts - a.ts) });
      }).catch(() => {});
  }
  mapAdminOrderRow(o) {
    const map = {
      done: 'done', pending: 'pending', paid: 'processing', fulfill_failed: 'failed',
      cancelled: 'cancelled', refunded: 'refund',
    };
    return {
      id: o.id, user: o.user || ('id' + (o.userId || '')), pid: o.playerId, productId: o.productId,
      amount: o.amount, buy: o.buy || 0, status: map[o.status] || o.status,
      dismissed: !!o.dismissed, ts: (o.createdAt || 0) * 1000,
    };
  }
  // заказы для админки — реальные, с сервера
  loadAdminOrders() {
    if (!isAdminUser()) return Promise.resolve();
    return fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData() })
    }).then(r => r.json()).then(d => {
      if (!d || !d.ok) {
        this.setState({ admToast: 'Не удалось загрузить заказы (проверьте Telegram)' });
        return;
      }
      const orders = (d.orders || []).map(o => this.mapAdminOrderRow(o));
      this.setState({ adminOrders: orders });
    }).catch(() => {
      this.setState({ admToast: 'Сеть недоступна' });
    });
  }
  // Пополнение баланса поставщика (Fazer crypto invoice)
  openTopup() { this.setState({ topup: { method: 'trc20', amount: '10', loading: false, error: '', payment: null } }); }
  closeTopup() { this.setState({ topup: null }); }
  setTopupMethod(m) { this.setState({ topup: { ...this.state.topup, method: m } }); }
  setTopupAmount(v) { this.setState({ topup: { ...this.state.topup, amount: String(v).replace(/[^\d.]/g, '') } }); }
  submitTopup() {
    const t = this.state.topup; if (!t) return;
    const amt = parseFloat(t.amount);
    if (!(amt >= 10)) { this.setState({ topup: { ...t, error: 'Минимальная сумма — $10' } }); return; }
    this.setState({ topup: { ...t, loading: true, error: '' } });
    fetch('/api/topup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), method: t.method, amount: amt })
    }).then(r => r.json()).then(d => {
      const pay = d && (d.payment || (d.ok && d.address ? d : null));
      if (pay && pay.address) this.setState({ topup: { ...this.state.topup, loading: false, payment: pay } });
      else this.setState({ topup: { ...this.state.topup, loading: false, error: (d && d.error) ? String(d.error).slice(0, 140) : 'Не удалось создать счёт' } });
    }).catch(() => this.setState({ topup: { ...this.state.topup, loading: false, error: 'Сеть недоступна' } }));
  }
  rateRub() { return this.state.supRate || 78.07; }
  buyRubOf(p) {
    if (p.buy != null && Number.isFinite(Number(p.buy))) return Math.round(Number(p.buy));
    return Math.round(Number(p.buyUsd || 0) * this.rateRub());
  }
  priceOf(p) { return Math.round(this.buyRubOf(p) * (1 + p.markup / 100)); }
  feePct() { return this.state.feePct || SERVICE_FEE_PCT; }
  serviceFee(subtotal) { return subtotal > 0 ? Math.round(subtotal * (this.feePct() / 100)) : 0; }
  totalWithFee(subtotal) { return Math.max(1, subtotal + this.serviceFee(subtotal)); }
  cartQtyOf(id) { return Math.max(0, Math.floor(Number(this.state.cartQty[id]) || 0)); }
  cartBump(id, delta) {
    const next = Math.min(99, Math.max(0, this.cartQtyOf(id) + delta));
    const cartQty = { ...this.state.cartQty };
    if (next <= 0) delete cartQty[id];
    else cartQty[id] = next;
    this.setState({ cartQty });
  }
  cartSummary() {
    let items = 0, rub = 0, uc = 0;
    for (const [id, q] of Object.entries(this.state.cartQty || {})) {
      const qty = Math.max(0, Math.floor(Number(q) || 0));
      if (!qty) continue;
      const p = this.state.products.find(x => x.id === id);
      if (!p) continue;
      items += qty;
      rub += this.priceOf(p) * qty;
      uc += (p.uc || 0) * qty;
    }
    return { items, rub, uc };
  }
  openCartCheckout() {
    const entries = Object.entries(this.state.cartQty || {}).filter(([, q]) => Math.floor(Number(q) || 0) > 0);
    if (!entries.length) return;
    const [productId, q] = entries[0];
    this.setState({
      selProduct: productId,
      orderQty: Math.min(99, Math.max(1, Math.floor(Number(q) || 1))),
      screen: 'checkout', tab: 'shop', pidError: '', appliedPromo: null, promoState: 'idle', promo: ''
    });
  }
  loadCatalog() {
    fetch('/api/catalog').then(r => r.ok ? r.json() : null).then(d => {
      if (!d || !d.ok) return;
      const byId = new Map((d.products || []).map(x => [x.id, x]));
      this.setState({
        supRate: Number(d.rate_rub) || this.state.supRate,
        feePct: Number(d.fee_pct) || this.state.feePct || SERVICE_FEE_PCT,
        products: this.state.products.map(p => {
          const c = byId.get(p.id);
          return c ? { ...p, buyUsd: Number(c.buyUsd), buy: Number(c.buyRub) } : p;
        }),
        defaultProducts: this.defaultProducts.map(p => {
          const c = byId.get(p.id);
          return c ? { ...p, buyUsd: Number(c.buyUsd), buy: Number(c.buyRub) } : p;
        }),
      });
    }).catch(() => {});
  }
  prod(id) { return this.state.products.find(p => p.id === id) || this.state.products[1]; }
  fmt(n) { return Math.round(n).toLocaleString('ru-RU'); }
  fmtTs(ts) {
    const d = new Date(ts);
    const m = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    return d.getDate() + ' ' + m[d.getMonth()] + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  meta(st) {
    return {
      done: { l: 'Выполнен', c: '#00f0ff' },
      processing: { l: 'В обработке', c: '#9a6bff' },
      paid: { l: 'Оплачен', c: '#7b2fff' },
      pending: { l: 'Ожидает оплаты', c: '#d9ff00' },
      failed: { l: 'Ошибка', c: '#ff2e7e' },
      refund: { l: 'Возврат', c: '#8b90ab' },
      cancelled: { l: 'Закрыт', c: '#8b90ab' }
    }[st] || { l: st, c: '#8b90ab' };
  }
  discount() {
    const a = this.state.appliedPromo;
    if (!a) return 0;
    const p = this.priceOf(this.prod(this.state.selProduct));
    const line = p * Math.max(1, this.state.orderQty || 1);
    return a.kind === 'pct' ? Math.round(line * a.val / 100) : Math.min(a.val, line - 1);
  }
  goPayment() {
    if (!/^\d{8,12}$/.test(this.state.playerId)) {
      this.setState({ pidError: 'Player ID — от 8 до 12 цифр, без пробелов', pidShake: true });
      this.later(() => this.setState({ pidShake: false }), 550);
      return;
    }
    this.setState({ screen: 'payment', pidError: '' });
  }
  startPay() {
    const s = this.state;
    const method = s.payMethod === 'card' ? 'card' : 'sbp';
    const savedIds = [s.playerId, ...s.savedIds.filter(x => x !== s.playerId)].slice(0, 5);
    try { localStorage.setItem(PIDS_KEY, JSON.stringify(savedIds)); } catch (e) {}
    this.setState({ screen: 'paywait', payProgress: 0, payErr: '', savedIds });
    fetch('/api/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: getInitData(), productId: s.selProduct, playerId: s.playerId, method,
        promo: s.appliedPromo ? s.appliedPromo.code : '',
        quantity: Math.max(1, Math.min(99, Math.floor(Number(s.orderQty) || 1)))
      })
    }).then(r => r.json()).then(d => {
      if (d && d.ok && d.redirect) {
        this.setState({ curOrderId: d.orderId, payRedirect: d.redirect });
        openPaymentUrl(d.redirect);
        this.pollOrder(d.orderId);
      } else {
        this.setState({ screen: 'payment', payErr: (d && d.error) ? String(d.error) : 'Не удалось создать платёж' });
      }
    }).catch(() => this.setState({ screen: 'payment', payErr: 'Сеть недоступна' }));
  }
  pollOrder(oid) {
    clearInterval(this.orderInt);
    this.orderStart = Date.now();
    this.orderInt = setInterval(() => {
      if (Date.now() - this.orderStart > 20 * 60 * 1000) { clearInterval(this.orderInt); return; }
      fetch('/api/order?id=' + encodeURIComponent(oid)).then(r => r.json()).then(d => {
        if (!d || !d.ok) return;
        const st = d.order.status;
        if (st === 'done') { clearInterval(this.orderInt); this.orderResolved(d.order, true); }
        else if (st === 'failed' || st === 'fulfill_failed') { clearInterval(this.orderInt); this.orderResolved(d.order, false); }
        else if (st === 'paid' && this.state.screen === 'paywait') { this.setState({ screen: 'status', stage: 1, success: false, curOrderId: oid }); }
      }).catch(() => {});
    }, 3000);
  }
  orderResolved(order, ok) {
    const p = this.prod(this.state.selProduct);
    const tg = getTgUser();
    const o = { id: order.id, user: tg && tg.handle ? tg.handle : (tg ? tg.name : '@you'), pid: order.playerId, productId: p.id, amount: order.amount, buy: p.buy, status: ok ? 'done' : 'failed', ts: Date.now() };
    const ap = this.state.appliedPromo;
    this.setState({
      screen: 'status', stage: ok ? 2 : 1, success: ok, curOrderId: order.id,
      myOrders: [o, ...this.state.myOrders.filter(x => x.id !== order.id)],
      promos: ap && ok ? this.state.promos.map(x => x.code === ap.code ? { ...x, used: x.used + 1 } : x) : this.state.promos
    });
  }
  startStatus() {
    const s = this.state;
    const id = 'IZ-' + (2484 + Math.floor(Math.random() * 90));
    const p = this.prod(s.selProduct);
    const tg = getTgUser();
    const order = { id, user: tg && tg.handle ? tg.handle : (tg ? tg.name : '@guest'), pid: s.playerId, productId: p.id, amount: this.priceOf(p) - this.discount(), buy: p.buy, status: 'processing', ts: Date.now() };
    const savedIds = [s.playerId, ...s.savedIds.filter(x => x !== s.playerId)].slice(0, 5);
    try { localStorage.setItem(PIDS_KEY, JSON.stringify(savedIds)); } catch (e) {}
    const ap = s.appliedPromo;
    this.setState({
      screen: 'status', stage: 0, success: false, curOrderId: id, savedIds,
      promos: ap ? s.promos.map(x => x.code === ap.code ? { ...x, used: x.used + 1 } : x) : s.promos,
      myOrders: [{ ...order }, ...s.myOrders],
      adminOrders: [{ ...order }, ...s.adminOrders]
    });
    this.later(() => this.setState({ stage: 1 }), 1500);
    this.later(() => this.setState({ stage: 2 }), 3000);
    this.later(() => {
      const up = o => o.id === id ? { ...o, status: 'done' } : o;
      this.setState({ success: true, myOrders: this.state.myOrders.map(up), adminOrders: this.state.adminOrders.map(up) });
    }, 3800);
  }
  applyPromo() {
    const c = this.state.promo.trim().toUpperCase();
    const f = this.state.promos.find(p => p.code === c && p.active && p.used < p.limit);
    if (f) this.setState({ appliedPromo: f, promoState: 'ok' });
    else {
      this.setState({ promoState: 'err', appliedPromo: null, promoShake: true });
      this.later(() => this.setState({ promoShake: false }), 550);
    }
  }
  events(o) {
    const e = [{ t: 'Заказ создан', ts: o.ts }];
    if (o.status === 'pending') return e;
    e.push({ t: 'Оплата получена · СБП', ts: o.ts + 42000 });
    if (o.status === 'paid') return e;
    e.push({ t: 'Передан поставщику · API', ts: o.ts + 61000 });
    if (o.status === 'processing') return e;
    if (o.status === 'failed') { e.push({ t: 'Ошибка поставщика: Player ID не найден', ts: o.ts + 140000, err: true }); return e; }
    if (o.status === 'refund') {
      e.push({ t: 'Ошибка поставщика: тайм-аут', ts: o.ts + 140000, err: true });
      e.push({ t: 'Средства возвращены клиенту', ts: o.ts + 400000 });
      return e;
    }
    e.push({ t: 'UC зачислены · ID ' + o.pid, ts: o.ts + 152000 });
    return e;
  }
  admAct(kind) {
    const s = this.state;
    if (!s.admSel || !getInitData()) {
      this.setState({ admToast: 'Нет авторизации Telegram — перезапустите мини-приложение' });
      return;
    }
    const id = s.admSel.id;
    fetch('/api/orders/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), orderId: id, action: kind })
    }).then(r => r.json()).then(d => {
      if (!d || !d.ok) {
        this.setState({ admToast: (d && d.error) ? String(d.error) : 'Не удалось сохранить' });
        return;
      }
      const msg = kind === 'resolve' ? 'Заказ закрыт' : kind === 'refund' ? 'Отмечен возврат' : 'Отправлено поставщику';
      return this.loadAdminOrders().then(() => {
        this.setState({ admSel: null, admToast: msg });
        this.later(() => this.setState({ admToast: '' }), 3500);
      });
    }).catch(() => this.setState({ admToast: 'Сеть недоступна' }));
  }
  bumpM(id, d) {
    this.setState({
      products: this.state.products.map(p => p.id === id ? { ...p, markup: Math.min(99, Math.max(0, p.markup + d)) } : p)
    });
  }
  createPromo() {
    const s = this.state;
    const code = s.npCode.trim().toUpperCase();
    if (code.length < 3 || s.promos.some(p => p.code === code)) {
      this.setState({ npErr: true });
      this.later(() => this.setState({ npErr: false }), 1500);
      return;
    }
    this.setState({
      promos: [{ code, kind: s.npKind, val: parseInt(s.npVal) || 5, used: 0, limit: parseInt(s.npLimit) || 100, active: true }, ...s.promos],
      npCode: '', npVal: '10', npLimit: '100'
    });
  }
  renderVals() {
    const s = this.state;
    const tgu = getTgUser();
    const CY = '#00f0ff', MG = '#ff00aa', VI = '#7b2fff', AC = '#d9ff00', MU = '#8b90ab', DIM = '#5a5f7d';
    const scanON = this.props.scanlines ?? true;
    const pausedON = this.props.shopPaused ?? false;
    const lowON = this.props.supplierLow ?? true;

    // ---- shop products
    // игры и их подразделы
    // структура по запросу клиента: паки UC / мифические кристаллы / прайм-подписки, остальное — «прочее»
    const SUBS = {
      pubgm: [['uc', 'ПАКИ UC'], ['mythic', 'КРИСТАЛЛЫ'], ['prime', 'ПРАЙМ'], ['other', 'ПРОЧЕЕ']],
      newstate: [['nc', 'NC-ПАКЕТЫ']]
    };
    const game = SUBS[s.game] ? s.game : 'pubgm';
    const gameSubs = SUBS[game];
    const sub = gameSubs.some(x => x[0] === s.shopCat) ? s.shopCat : gameSubs[0][0];
    const actives = s.products.filter(p => p.active && p.game === game);
    // ₽/ед. считается внутри валютных подразделов (uc, nc)
    const minPerBy = {};
    ['uc', 'nc'].forEach(k => {
      const list = s.products.filter(p => p.active && p.sub === k && p.uc > 0);
      minPerBy[k] = list.length ? Math.min(...list.map(p => this.priceOf(p) / p.uc)) : 1;
    });
    const view = p => {
      const price = this.priceOf(p);
      const canQty = p.sub === 'uc' || p.sub === 'nc';
      const qty = this.cartQtyOf(p.id);
      const linePrice = qty > 0 ? price * qty : price;
      const isUc = p.uc > 0;
      const per = isUc ? price / p.uc : 0;
      return {
        ucF: String(p.uc),
        unit: p.unit || 'UC',
        name: p.name,
        priceF: this.fmt(linePrice), unitPriceF: this.fmt(price), oldF: this.fmt(p.old) + ' ₽',
        canQty, qty,
        incQty: e => { e && e.stopPropagation && e.stopPropagation(); this.cartBump(p.id, 1); },
        decQty: e => { e && e.stopPropagation && e.stopPropagation(); this.cartBump(p.id, -1); },
        saveF: this.fmt(p.old - price),
        perUc: isUc ? per.toFixed(2) : '',
        meterW: isUc ? Math.round((minPerBy[p.sub] || 1) / per * 100) + '%' : '0%',
        isUc, notUc: !isUc,
        iconText: p.icon || (p.unit === 'NC' ? 'NC' : 'UC'),
        iconBg: p.iconBg || (p.unit === 'NC' ? 'linear-gradient(135deg,#00f0ff,#7b2fff)' : 'radial-gradient(circle at 35% 30%,#ffe98a,#f0b429 55%,#9c6b10)'),
        iconC: p.iconC || (p.unit === 'NC' ? '#04202b' : '#3d2b00'),
        iconGlow: p.sub === 'uc' ? '0 0 8px rgba(240,180,41,.35)' : '0 0 8px rgba(123,47,255,.45)',
        // карточка в стиле RefCod: картинка товара (пока плейсхолдер — заменит дизайнер, поле p.img)
        imgUrl: p.img || '',
        hasOld: p.old > price,
        iconRound: p.sub === 'uc',
        bigGlow: p.sub === 'uc' ? '0 0 30px rgba(240,180,41,.4)' : '0 0 30px rgba(123,47,255,.4)',
        badge: p.badge, hasBadge: !!p.badge,
        badgeC: p.badge === 'ПОПУЛЯРНЫЙ' ? MG : (p.badge === 'MAX' ? '#b18cff' : AC),
        select: () => {
          const q = canQty ? Math.max(1, this.cartQtyOf(p.id) || 1) : 1;
          if (canQty && this.cartQtyOf(p.id) <= 0) this.cartBump(p.id, 1);
          this.setState({
            selProduct: p.id, orderQty: q, screen: 'checkout', tab: 'shop',
            pidError: '', appliedPromo: null, promoState: 'idle', promo: ''
          });
        }
      };
    };
    // витрина в структуре RefCod: единая сетка карточек, без отдельного «хита»
    const featP = null;
    const comboP = null;
    const feat = featP ? view(featP) : {};
    const combo = comboP ? view(comboP) : {};
    const shopRest = actives.filter(p => p.sub === sub && p !== featP).map(view);
    shopRest.forEach((v, i) => {
      v.colSpan = (i === shopRest.length - 1 && shopRest.length % 2 === 1) ? 'span 2' : 'auto';
      v.delay = (0.18 + i * 0.06).toFixed(2) + 's';
    });

    // ---- checkout
    const sel = this.prod(s.selProduct);
    const selQty = Math.max(1, Math.min(99, Math.floor(Number(s.orderQty) || 1)));
    const selUnit = this.priceOf(sel);
    const selPrice = selUnit * selQty;
    const disc = this.discount();
    const subtotal = selPrice - disc;
    const fee = this.serviceFee(subtotal);
    const total = this.totalWithFee(subtotal);
    const cart = this.cartSummary();
    const ap = s.appliedPromo;

    // ---- stages
    const stages = [
      { t: 'Оплачен', d: this.mLabel(s.payMethod) + ' · ' + this.fmt(total) + ' ₽' + (selQty > 1 ? ' · ' + selQty + ' шт.' : ''), i: 0 },
      { t: 'Передан поставщику', d: 'API поставщика · автоматически', i: 1 },
      { t: (sel.unit === 'NC' ? 'NC' : (sel.sub === 'uc' ? 'UC' : 'Товар')) + (sel.sub === 'uc' || sel.unit === 'NC' ? ' зачислены' : ' выдан'), d: 'Player ID ' + s.playerId, i: 2 }
    ].map((st, i) => {
      const isDone = i < s.stage || (i === 2 && s.success);
      const active = !isDone && i === s.stage;
      return {
        t: st.t, d: st.d, done: isDone, active,
        dotBg: isDone ? CY : 'transparent',
        dotB: isDone ? CY : (active ? CY : 'rgba(139,144,171,.35)'),
        dotG: isDone ? '0 0 12px rgba(0,240,255,.6)' : 'none',
        dotAnim: active ? 'iziPulseC 1.2s ease-in-out infinite' : 'none',
        titleC: isDone ? '#e9eaf4' : (active ? CY : DIM),
        hasLine: i < 2,
        lineC: isDone ? 'rgba(0,240,255,.5)' : 'rgba(139,144,171,.18)'
      };
    });

    // ---- my orders
    const ordFilterDefs = [
      { k: 'all', l: 'Все' }, { k: 'done', l: 'Выполнен' }, { k: 'processing', l: 'В обработке' }, { k: 'failed', l: 'Ошибка' }
    ];
    const ordFilters = ordFilterDefs.map(f => {
      const a = s.orderFilter === f.k;
      return { l: f.l, set: () => this.setState({ orderFilter: f.k }), bg: a ? 'rgba(0,240,255,.12)' : 'rgba(19,21,40,.55)', bd: a ? 'rgba(0,240,255,.55)' : 'rgba(139,144,171,.2)', c: a ? CY : MU };
    });
    const myFiltered = s.myOrders.filter(o => s.orderFilter === 'all' || o.status === s.orderFilter);
    const ordList = myFiltered.map(o => {
      const m = this.meta(o.status);
      const p = this.prod(o.productId);
      return {
        name: p.name, idText: o.id, amountF: this.fmt(o.amount), timeF: this.fmtTs(o.ts),
        stL: m.l, stC: m.c, canRepeat: o.status === 'done',
        repeat: () => this.setState({ mode: 'client', selProduct: o.productId, playerId: o.pid, screen: 'checkout', tab: 'shop', appliedPromo: null, promoState: 'idle', promo: '', pidError: '' })
      };
    });

    // ---- KPI
    const now = Date.now();
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const cutoff = { day: dayStart.getTime(), week: now - 7 * 86400000, month: now - 30 * 86400000 }[s.revPeriod];
    const paidSt = ['paid', 'processing', 'done'];
    const rows = s.adminOrders.filter(o => o.ts >= cutoff && paidSt.includes(o.status));
    const rev = rows.reduce((a, o) => a + o.amount, 0);
    const cnt = rows.length;
    const profit = rows.reduce((a, o) => a + (o.amount - (o.buy || 0)), 0);
    const perChips = [{ k: 'day', l: 'Д' }, { k: 'week', l: 'Н' }, { k: 'month', l: 'М' }].map(c => {
      const a = s.revPeriod === c.k;
      return { l: c.l, set: () => this.setState({ revPeriod: c.k }), bg: a ? 'rgba(255,0,170,.15)' : 'transparent', bd: a ? 'rgba(255,0,170,.6)' : 'rgba(139,144,171,.25)', c: a ? MG : DIM };
    });

    // ---- chart
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const st0 = dayStart.getTime() - i * 86400000;
      days.push(s.adminOrders.filter(o => o.ts >= st0 && o.ts < st0 + 86400000 && paidSt.includes(o.status)).reduce((a, o) => a + o.amount, 0));
    }
    const mx = Math.max(...days, 1);
    const pts = days.map((r, i) => ((i * 300 / 13).toFixed(1)) + ',' + ((92 - r / mx * 78).toFixed(1))).join(' ');
    const chartBars = days.map(r => ({ barH: Math.max(2, Math.round(r / mx * 78)) }));
    const dLbl = ts => { const d = new Date(ts); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); };

    // ---- admin orders
    const admChipDefs = [{ k: 'all', l: 'Все' }, { k: 'done', l: 'Выполнен' }, { k: 'processing', l: 'В обработке' }, { k: 'issues', l: 'Проблемы' }];
    const admChips = admChipDefs.map(f => {
      const a = s.admFilter === f.k;
      return { l: f.l, set: () => this.setState({ admFilter: f.k }), bg: a ? 'rgba(255,0,170,.13)' : 'rgba(19,21,40,.55)', bd: a ? 'rgba(255,0,170,.55)' : 'rgba(139,144,171,.2)', c: a ? MG : MU };
    });
    const q = s.admSearch.trim().toLowerCase();
    const issues = ['failed', 'refund', 'pending'];
    const admFilteredAll = s.adminOrders.filter(o => {
      if (o.dismissed && s.admFilter === 'issues') return false;
      const okF = s.admFilter === 'all' || (s.admFilter === 'issues' ? issues.includes(o.status) : o.status === s.admFilter);
      const okQ = !q || o.id.toLowerCase().includes(q) || o.user.toLowerCase().includes(q) || o.pid.includes(q);
      return okF && okQ;
    });
    const admRows = admFilteredAll.slice(0, 18).map(o => {
      const m = this.meta(o.status);
      return {
        idText: o.id, user: o.user, pid: o.pid, name: this.prod(o.productId).name,
        amountF: this.fmt(o.amount), stL: m.l, stC: m.c, timeF: this.fmtTs(o.ts),
        open: () => this.setState({ admSel: { ...o, events: this.events(o) } })
      };
    });
    const recent = s.adminOrders.slice(0, 5).map(o => {
      const m = this.meta(o.status);
      return { idText: o.id, user: o.user, name: this.prod(o.productId).name, amountF: this.fmt(o.amount), stC: m.c };
    });

    // ---- detail
    const d = s.admSel;
    const dm = d ? this.meta(d.status) : { l: '', c: MU };
    const dEvents = d ? d.events.map((ev, i) => ({
      t: ev.t, timeF: this.fmtTs(ev.ts),
      dotC: ev.err ? '#ff2e7e' : CY, tC: ev.err ? '#ff7ea9' : '#c7cae0',
      hasLine: i < d.events.length - 1
    })) : [];

    // ---- products admin
    const prodRows = s.products.map(p => {
      const hot = p.badge === 'ПОПУЛЯРНЫЙ';
      return {
        name: p.name, buyF: this.fmt(this.buyRubOf(p)), markup: p.markup, priceF: this.fmt(this.priceOf(p)),
        catL: ({ uc: 'UC', mythic: 'КРИСТ', prime: 'ПРАЙМ', other: 'ПРОЧЕЕ', nc: 'NC' })[p.sub] || 'UC',
        badge: p.badge, hasBadge: !!p.badge, badgeC: hot ? MG : (p.badge === 'КОМБО' ? '#b18cff' : AC),
        rowOp: p.active ? 1 : 0.45,
        tglBg: p.active ? 'rgba(0,240,255,.25)' : 'rgba(139,144,171,.15)',
        tglBd: p.active ? 'rgba(0,240,255,.6)' : 'rgba(139,144,171,.3)',
        knobL: p.active ? '20px' : '2px',
        knobG: p.active ? '0 0 8px rgba(0,240,255,.7)' : 'none',
        tgl: () => this.setState({ products: s.products.map(x => x.id === p.id ? { ...x, active: !x.active } : x) }),
        inc: () => this.bumpM(p.id, 1), dec: () => this.bumpM(p.id, -1)
      };
    });

    // ---- promos admin
    const promoRows = s.promos.map(pm => ({
      code: pm.code,
      label: pm.kind === 'pct' ? '−' + pm.val + '%' : '−' + pm.val + ' ₽',
      usage: pm.used + ' / ' + pm.limit,
      useW: Math.min(100, Math.round(pm.used / pm.limit * 100)) + '%',
      rowOp: pm.active ? 1 : 0.45,
      tglBg: pm.active ? 'rgba(255,0,170,.25)' : 'rgba(139,144,171,.15)',
      tglBd: pm.active ? 'rgba(255,0,170,.6)' : 'rgba(139,144,171,.3)',
      knobL: pm.active ? '20px' : '2px',
      tgl: () => this.setState({ promos: s.promos.map(x => x.code === pm.code ? { ...x, active: !x.active } : x) }),
      del: () => this.setState({ promos: s.promos.filter(x => x.code !== pm.code) })
    }));

    // ---- main button
    let mbVisible = false, mbLabel = '', mbClick = () => {};
    if (s.screen === 'checkout') { mbVisible = true; mbLabel = 'К ОПЛАТЕ · ' + this.fmt(total) + ' ₽'; mbClick = () => this.goPayment(); }
    else if (s.screen === 'shop' && cart.items > 0) {
      mbVisible = true;
      mbLabel = 'КОРЗИНА · ' + this.fmt(cart.rub) + ' ₽';
      mbClick = () => this.openCartCheckout();
    }
    else if (s.screen === 'payment') { mbVisible = true; mbLabel = 'ОПЛАТИТЬ ' + this.fmt(total) + ' ₽'; mbClick = () => this.startPay(); }
    else if (s.screen === 'status' && s.success) { mbVisible = true; mbLabel = 'НА ГЛАВНУЮ'; mbClick = () => this.setState({ screen: 'shop', tab: 'shop', stage: -1, success: false, appliedPromo: null, promo: '', promoState: 'idle' }); }
    const isClient = s.mode === 'client';

    const mSel = s.payMethod;
    const mB = on => on ? 'rgba(0,240,255,.55)' : 'rgba(0,240,255,.1)';
    const mG = on => on ? '0 0 18px rgba(0,240,255,.25)' : 'none';
    const mR = on => on ? CY : 'rgba(139,144,171,.4)';
    const mRF = on => on ? CY : 'transparent';
    const mRG = on => on ? '0 0 10px rgba(0,240,255,.7)' : 'none';

    const tabC = k => s.tab === k ? CY : DIM;
    const tabBar = k => s.tab === k ? CY : 'transparent';
    const tabBarG = k => s.tab === k ? '0 0 8px rgba(0,240,255,.8)' : 'none';
    const aC = k => s.adminTab === k ? MG : DIM;
    const aBar = k => s.adminTab === k ? MG : 'transparent';

    return {
      // env
      scanON, pausedON, lowON,
      isClient, isAdmin: s.mode === 'admin',
      isShop: isClient && s.screen === 'shop',
      isCheckout: isClient && s.screen === 'checkout',
      isPayment: isClient && s.screen === 'payment',
      isPaywait: isClient && s.screen === 'paywait',
      isStatus: isClient && s.screen === 'status',
      isOrders: isClient && s.screen === 'orders',
      isProfile: isClient && s.screen === 'profile',
      tabVisible: isClient && ['shop', 'orders', 'profile'].includes(s.screen),
      mbVisible, mbLabel, mbClick,
      // nav
      goShop: () => this.setState({ screen: 'shop', tab: 'shop' }),
      goOrders: () => { this.setState({ screen: 'orders', tab: 'orders' }); this.loadMyOrders(); },
      goProfile: () => this.setState({ screen: 'profile', tab: 'profile' }),
      backCheckout: () => this.setState({ screen: 'checkout' }),
      canAdmin: isAdminUser(),
      enterAdmin: () => {
        if (isAdminUser()) {
          this.setState({ mode: 'admin', adminOrders: [], admSel: null });
          this.loadCatalog();
          this.loadAdminOrders();
          this.loadAudiences();
        }
      },
      refreshOrders: () => this.loadAdminOrders(),
      exitAdmin: () => this.setState({ mode: 'client', screen: 'profile', tab: 'profile', admSel: null }),
      cShop: tabC('shop'), cOrders: tabC('orders'), cProfile: tabC('profile'),
      iShopBar: tabBar('shop'), iOrdBar: tabBar('orders'), iProfBar: tabBar('profile'),
      iShopBarG: tabBarG('shop'), iOrdBarG: tabBarG('orders'), iProfBarG: tabBarG('profile'),
      // shop
      hasFeat: !!featP, feat, hasCombo: !!comboP, combo, shopRest,
      tickerText: s.adminOrders.filter(o => o.status === 'done').slice(0, 7).map(o => o.user + ' → ' + this.prod(o.productId).name).join('   ▸   ') + '   ▸   ',
      catLabel: { uc: 'ПАКИ UC', mythic: 'КРИСТАЛЛЫ', prime: 'ПРАЙМ', other: 'ПРОЧЕЕ', nc: 'NC-ПАКЕТЫ' }[sub],
      // игры (верхний уровень витрины); недоступные — «скоро»
      games: [
        { key: 'pubgm', name: 'PUBG', name2: 'MOBILE', tag: 'UC · Кристаллы · Прайм', letter: 'P', iconBg: 'radial-gradient(circle at 35% 30%,#ffe98a,#f0b429 55%,#9c6b10)', iconC: '#3d2b00', glowC: 'rgba(240,180,41,.45)' },
        { key: 'newstate', name: 'PUBG', name2: 'NEW STATE', tag: 'NC · пополнение по ID', letter: 'N', iconBg: 'linear-gradient(135deg,#00f0ff,#7b2fff)', iconC: '#04202b', glowC: 'rgba(0,240,255,.45)' },
        { key: 'ml', name: 'MOBILE', name2: 'LEGENDS', tag: 'СКОРО', soon: true, letter: 'M', iconBg: 'linear-gradient(135deg,#3a3f63,#23263f)', iconC: '#8b90ab' },
        { key: 'so2', name: 'STANDOFF', name2: '2', tag: 'СКОРО', soon: true, letter: 'S', iconBg: 'linear-gradient(135deg,#3a3f63,#23263f)', iconC: '#8b90ab' }
      ].map(g => {
        const on = !g.soon && game === g.key;
        return {
          ...g,
          on,
          pick: g.soon ? () => {} : () => this.setState({ game: g.key, shopCat: (SUBS[g.key] || SUBS.pubgm)[0][0] }),
          bg: g.soon ? 'rgba(19,21,40,.55)' : (on ? 'linear-gradient(150deg,rgba(0,240,255,.16),rgba(123,47,255,.18) 55%,rgba(255,0,170,.14))' : 'rgba(19,21,40,.75)'),
          bd: g.soon ? 'rgba(139,144,171,.18)' : (on ? 'rgba(0,240,255,.55)' : 'rgba(0,240,255,.18)'),
          glow: on ? '0 0 22px rgba(0,240,255,.22)' : 'none',
          iconGlow: g.soon ? 'none' : (on ? '0 0 12px ' + (g.glowC || 'rgba(0,240,255,.45)') : 'none'),
          nameC: g.soon ? DIM : (on ? '#f2f4ff' : '#8b90ab'),
          tagC: g.soon ? DIM : (on ? CY : MU),
          op: g.soon ? 0.62 : 1
        };
      }),
      // табы-категории в стиле RefCod: картинка-иконка + подпись, активный — фиолетовая рамка
      subChips: gameSubs.map(([k, l]) => {
        const a = sub === k;
        const ic = ({
          uc: { t: 'UC', bg: 'radial-gradient(circle at 35% 30%,#ffe98a,#f0b429 55%,#9c6b10)', c: '#3d2b00', round: true },
          mythic: { t: '◆', bg: 'linear-gradient(135deg,#00f0ff,#7b2fff)', c: '#04202b' },
          prime: { t: 'P', bg: 'linear-gradient(135deg,#7b2fff,#4a1a99)', c: '#fff' },
          other: { t: '✦', bg: 'linear-gradient(135deg,#ff00aa,#8a0a4a)', c: '#fff' },
          nc: { t: 'NC', bg: 'linear-gradient(135deg,#00f0ff,#7b2fff)', c: '#04202b' }
        })[k] || { t: '·', bg: 'rgba(19,21,40,.7)', c: '#8b90ab' };
        return {
          l, icon: ic,
          set: () => this.setState({ shopCat: k }),
          bg: a ? 'rgba(123,47,255,.14)' : 'rgba(19,21,40,.6)',
          bd: a ? 'rgba(177,140,255,.85)' : 'rgba(139,144,171,.22)',
          g: a ? '0 0 16px rgba(123,47,255,.35)' : 'none',
          c: a ? '#e9eaf4' : MU
        };
      }),
      // документы (просмотр внутри мини-аппа)
      docUrl: s.docUrl, docTitle: s.docTitle, docOpen: !!s.docUrl,
      openDoc: (url, title) => this.setState({ docUrl: url, docTitle: title }),
      closeDoc: () => this.setState({ docUrl: '', docTitle: '' }),
      // boot
      booting: !!s.booting, bootOp: s.bootOp, bootW: (s.bootP || 0) + '%',
      bootPct: Math.round(s.bootP || 0) + '%', bootLine: s.bootLine || '',
      skipBoot: () => this.skipBoot(),
      // checkout
      selName: selQty > 1 ? selQty + '× ' + sel.name : sel.name,
      selPriceF: this.fmt(selPrice), selQty, selUnitF: this.fmt(selUnit),
      incOrderQty: () => this.setState({ orderQty: Math.min(99, selQty + 1) }),
      decOrderQty: () => this.setState({ orderQty: Math.max(1, selQty - 1) }),
      canOrderQty: sel.sub === 'uc' || sel.sub === 'nc',
      subtotalF: this.fmt(subtotal), feeF: this.fmt(fee), feePct: this.feePct(),
      hasFee: fee > 0,
      cartItems: cart.items, cartUc: cart.uc, cartRubF: this.fmt(cart.rub), cartVisible: cart.items > 0,
      openCartCheckout: () => this.openCartCheckout(),
      playerId: s.playerId, nickname: s.nickname, promo: s.promo,
      setPid: e => this.setState({ playerId: e.target.value.replace(/\D/g, '').slice(0, 12), pidError: '' }),
      setNick: e => this.setState({ nickname: e.target.value }),
      setPromo: e => this.setState({ promo: e.target.value, promoState: 'idle', appliedPromo: null }),
      pidError: s.pidError, pidHasError: !!s.pidError,
      pidBorder: s.pidError ? 'rgba(255,46,126,.7)' : 'rgba(0,240,255,.16)',
      pidAnim: s.pidShake ? 'iziShake .45s ease-in-out' : 'none',
      promoAnim: s.promoShake ? 'iziShake .45s ease-in-out' : 'none',
      showHint: s.showHint,
      toggleHint: () => this.setState({ showHint: !s.showHint }),
      applyPromo: () => this.applyPromo(),
      promoOk: s.promoState === 'ok', promoErrF: s.promoState === 'err',
      promoOkLabel: ap ? (ap.kind === 'pct' ? '−' + ap.val + '%' : '−' + ap.val + ' ₽') : '',
      hasDiscount: disc > 0, discountF: this.fmt(disc), totalF: this.fmt(total),
      // payment
      pickSbp: () => this.setState({ payMethod: 'sbp' }),
      pickCard: () => this.setState({ payMethod: 'card' }),
      pickCrypto: () => this.setState({ payMethod: 'crypto' }),
      mSbpB: mB(mSel === 'sbp'), mSbpG: mG(mSel === 'sbp'), mSbpR: mR(mSel === 'sbp'), mSbpRF: mRF(mSel === 'sbp'), mSbpRG: mRG(mSel === 'sbp'),
      mCardB: mB(mSel === 'card'), mCardG: mG(mSel === 'card'), mCardR: mR(mSel === 'card'), mCardRF: mRF(mSel === 'card'), mCardRG: mRG(mSel === 'card'),
      mCryB: mB(mSel === 'crypto'), mCryG: mG(mSel === 'crypto'), mCryR: mR(mSel === 'crypto'), mCryRF: mRF(mSel === 'crypto'), mCryRG: mRG(mSel === 'crypto'),
      payMethodLabel: this.mLabel(mSel),
      payProgressW: Math.min(100, s.payProgress) + '%',
      payPct: Math.round(Math.min(100, s.payProgress)) + '%',
      payErr: s.payErr || '', payHasErr: !!s.payErr,
      reopenPay: () => { if (s.payRedirect) openPaymentUrl(s.payRedirect); },
      // status
      stages, success: s.success, notSuccess: !s.success, curOrderId: s.curOrderId || 'IZ-····',
      // orders
      ordFilters, ordList, ordersEmpty: myFiltered.length === 0,
      // profile
      tgName: tgu ? tgu.name : 'Гость',
      tgHandle: tgu && tgu.handle ? tgu.handle + ' · Telegram' : 'Telegram',
      tgPhoto: tgu ? tgu.photoUrl : '',
      hasPhoto: !!(tgu && tgu.photoUrl),
      avatarLetter: ((tgu && tgu.name) || 'Г')[0].toUpperCase(),
      hasSaved: s.savedIds.length > 0,
      savedRows: s.savedIds.map((pid, i) => ({
        pid,
        main: i === 0,
        isLast: i === s.savedIds.length - 1,
        copied: s.copiedPid === pid,
        copy: () => {
          try { navigator.clipboard.writeText(pid); } catch (e) {}
          this.setState({ copiedPid: pid });
          this.later(() => this.setState({ copiedPid: '' }), 1500);
        }
      })),
      // admin
      admDash: s.adminTab === 'dash', admOrd: s.adminTab === 'orders',
      admProd: s.adminTab === 'products', admPromo: s.adminTab === 'promos', admBcast: s.adminTab === 'broadcast',
      aDash: () => this.setState({ adminTab: 'dash' }),
      aOrd: () => { this.setState({ adminTab: 'orders' }); this.loadAdminOrders(); },
      aProd: () => this.setState({ adminTab: 'products' }),
      aPromo: () => this.setState({ adminTab: 'promos' }),
      aBcast: () => { this.setState({ adminTab: 'broadcast' }); this.loadAudiences(); },
      cDash: aC('dash'), cAOrd: aC('orders'), cProd: aC('products'), cPromo: aC('promos'), cBcast: aC('broadcast'),
      iDashBar: aBar('dash'), iAOrdBar: aBar('orders'), iProdBar: aBar('products'), iPromoBar: aBar('promos'), iBcastBar: aBar('broadcast'),
      // рассылка
      bcText: s.bcText, setBcText: e => this.setState({ bcText: e.target.value }),
      bcBtnText: s.bcBtnText, setBcBtnText: e => this.setState({ bcBtnText: e.target.value }),
      bcBtnUrl: s.bcBtnUrl, setBcBtnUrl: e => this.setState({ bcBtnUrl: e.target.value }),
      bcAudience: s.bcAudience,
      bcAudChips: [['all', 'Все'], ['buyers', 'Покупатели'], ['nobuy', 'Без покупок']].map(([k, l]) => {
        const a = s.bcAudience === k;
        const n = s.bcCounts ? s.bcCounts[k] : null;
        return { k, l, n, active: a, set: () => this.setState({ bcAudience: k }),
          bg: a ? 'rgba(255,0,170,.16)' : 'rgba(19,21,40,.6)', bd: a ? 'rgba(255,0,170,.6)' : 'rgba(139,144,171,.22)', c: a ? MG : MU };
      }),
      bcErr: s.bcErr, bcHasErr: !!s.bcErr,
      bcRunning: !!(s.bcStatus && s.bcStatus.running),
      bcStatus: s.bcStatus, bcHasStatus: !!s.bcStatus,
      bcSentF: s.bcStatus ? (s.bcStatus.sent + ' / ' + s.bcStatus.total) : '',
      bcFailed: s.bcStatus ? s.bcStatus.failed : 0,
      sendBroadcast: () => this.sendBroadcast(),
      bcImageName: s.bcImageName, bcHasImage: !!s.bcImageId, bcUploading: s.bcUploading,
      uploadBcImage: e => { const f = e.target.files && e.target.files[0]; if (f) this.uploadBcImage(f); e.target.value = ''; },
      clearBcImage: () => this.clearBcImage(),
      perChips,
      revF: this.fmt(rev), ordCount: cnt, avgF: this.fmt(cnt ? rev / cnt : 0),
      marginF: rev ? (profit / rev * 100).toFixed(1) : '0',
      chartPts: pts, chartArea: pts + ' 300,92 0,92', chartBars,
      chartMaxF: this.fmt(mx),
      chartFrom: dLbl(dayStart.getTime() - 13 * 86400000), chartTo: dLbl(dayStart.getTime()),
      // реальный баланс поставщика (из /api/balance); нет данных → «—»
      supHas: s.supBalUsd != null,
      supBalF: s.supBalUsd != null ? this.fmt(s.supBalUsd * (s.supRate || 1)) : '—',
      supLow: s.supBalUsd != null && (s.supBalUsd * (s.supRate || 1)) < 500,
      balBorder: (s.supBalUsd != null && (s.supBalUsd * (s.supRate || 1)) < 500) ? 'rgba(255,46,126,.4)' : 'rgba(0,240,255,.12)',
      recent, hasRecent: recent.length > 0,
      admSearch: s.admSearch, setSearch: e => this.setState({ admSearch: e.target.value }),
      admChips, admRows, admEmpty: admFilteredAll.length === 0, admToast: s.admToast || '',
      // detail
      dOpen: !!d,
      dIdText: d ? d.id : '', dUser: d ? d.user : '', dPid: d ? d.pid : '',
      dName: d ? this.prod(d.productId).name : '', dAmountF: d ? this.fmt(d.amount) : '',
      dStL: dm.l, dStC: dm.c, dEvents,
      closeAdm: () => this.setState({ admSel: null }),
      stopProp: e => e.stopPropagation(),
      actResend: () => this.admAct('resend'),
      actRefund: () => this.admAct('refund'),
      actResolve: () => this.admAct('resolve'),
      // products / promos
      prodRows, promoRows,
      // общая наценка на все товары (через this.state — замыкание на s отдаёт устаревший снапшот)
      bulkM: s.bulkMarkup,
      bulkInc: () => this.setState({ bulkMarkup: Math.min(99, this.state.bulkMarkup + 1) }),
      bulkDec: () => this.setState({ bulkMarkup: Math.max(0, this.state.bulkMarkup - 1) }),
      bulkApply: () => this.setState({ products: this.state.products.map(p => ({ ...p, markup: this.state.bulkMarkup })) }),
      // сохранение конфига (цены/наценки/промо) на сервер
      cfgDirty: s.savedCfg !== '' && this.cfgStr(this.buildConfig()) !== s.savedCfg,
      cfgSaving: s.cfgSaving,
      saveConfig: () => this.saveConfig(),
      cancelConfig: () => this.cancelConfig(),
      // пополнение баланса поставщика
      topupOpen: !!s.topup,
      topupMethod: s.topup ? s.topup.method : 'trc20',
      topupAmount: s.topup ? s.topup.amount : '',
      topupLoading: !!(s.topup && s.topup.loading),
      topupError: s.topup ? s.topup.error : '',
      topupPay: s.topup ? s.topup.payment : null,
      openTopup: () => this.openTopup(),
      closeTopup: () => this.closeTopup(),
      setTopupMethod: m => this.setTopupMethod(m),
      setTopupAmount: e => this.setTopupAmount(e.target.value),
      submitTopup: () => this.submitTopup(),
      npCode: s.npCode, npVal: s.npVal, npLimit: s.npLimit,
      setNpCode: e => this.setState({ npCode: e.target.value }),
      setNpVal: e => this.setState({ npVal: e.target.value.replace(/\D/g, '') }),
      setNpLimit: e => this.setState({ npLimit: e.target.value.replace(/\D/g, '') }),
      npBorder: s.npErr ? 'rgba(255,46,126,.7)' : 'rgba(0,240,255,.16)',
      setPct: () => this.setState({ npKind: 'pct' }),
      setFix: () => this.setState({ npKind: 'fix' }),
      npPctBg: s.npKind === 'pct' ? 'rgba(255,0,170,.16)' : 'transparent',
      npPctBd: s.npKind === 'pct' ? 'rgba(255,0,170,.6)' : 'rgba(139,144,171,.25)',
      npPctC: s.npKind === 'pct' ? MG : DIM,
      npFixBg: s.npKind === 'fix' ? 'rgba(255,0,170,.16)' : 'transparent',
      npFixBd: s.npKind === 'fix' ? 'rgba(255,0,170,.6)' : 'rgba(139,144,171,.25)',
      npFixC: s.npKind === 'fix' ? MG : DIM,
      createPromo: () => this.createPromo()
    };
  }
  mLabel(m) { return { sbp: 'СБП', card: 'Банковская карта', crypto: 'Криптовалюта' }[m] || m; }
}
