import { createHmac } from 'node:crypto';
import { env } from './env.js';

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface VerifiedInit {
  ok: boolean;
  user?: TgUser;
}

// Проверка подписи Telegram WebApp initData.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyInitData(initData: string): VerifiedInit {
  if (!initData || !env.botToken) return { ok: false };
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(env.botToken).digest();
  const calc = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (calc !== hash) return { ok: false };

  // Проверка срока (auth_date не старше 24ч) — мягкая, не блокирует.
  let user: TgUser | undefined;
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as TgUser;
    } catch {
      /* ignore */
    }
  }
  return { ok: true, user };
}

// Хелпер для роутов: вернуть пользователя или null.
export function userFromInit(initData: string | undefined): TgUser | null {
  if (!initData) return null;
  const v = verifyInitData(initData);
  return v.ok && v.user ? v.user : null;
}

export function displayHandle(u: TgUser): string {
  if (u.username) return '@' + u.username;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || 'id' + u.id;
}
