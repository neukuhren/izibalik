import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Простой загрузчик .env (без зависимостей). Реальные env перекрывают файл.
function loadDotEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    /* .env необязателен */
  }
}
loadDotEnv();

const str = (k: string, def = ''): string => process.env[k] ?? def;
const num = (k: string, def: number): number => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) ? v : def;
};

export const env = {
  port: num('PORT', 8080),
  host: str('HOST', '0.0.0.0'),
  serveDist: str('SERVE_DIST'),

  botToken: str('BOT_TOKEN'),
  miniAppUrl: str('MINIAPP_URL'),
  adminIds: str('ADMIN_IDS', '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0),

  fazerBase: str('FAZER_BASE', 'https://api.fzr.cards/api/v2'),
  fazerKey: str('FAZER_API_KEY'),
  fallbackRate: num('FALLBACK_RATE_RUB', 78.07),

  paymentProvider: str('PAYMENT_PROVIDER', 'stub'),
  publicUrl: str('PUBLIC_URL', 'http://localhost:8080'),
  payStubAutopayMs: num('PAY_STUB_AUTOPAY_MS', 0),

  plategaBase: str('PLATEGA_BASE', 'https://app.platega.io'),
  plategaMerchantId: str('PLATEGA_MERCHANT_ID'),
  plategaSecret: str('PLATEGA_SECRET'),
  plategaMethodSbp: num('PLATEGA_METHOD_SBP', 2),

  dbPath: str('DB_PATH', './data/izibalik.sqlite'),
};

export const isAdmin = (id: number | undefined | null): boolean =>
  !!id && env.adminIds.includes(id);
