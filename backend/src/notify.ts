// Развязка отправки сообщений из orders.ts и бота (без циклических импортов).
import { env } from './env.js';

type Sender = (userId: number, text: string) => Promise<void>;

let sender: Sender | null = null;

export function setSender(fn: Sender): void {
  sender = fn;
}

/** Прямой вызов API — нужен в cron job refresh-paid (отдельный процесс без grammy). */
async function sendTelegramDirect(userId: number, text: string): Promise<void> {
  const token = env.botToken;
  if (!token) return;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: userId, text }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.warn('[notify] Telegram API', userId, r.status, body.slice(0, 240));
  }
}

export async function notifyUser(userId: number, text: string): Promise<void> {
  try {
    if (sender) {
      await sender(userId, text);
      return;
    }
    await sendTelegramDirect(userId, text);
  } catch (e) {
    console.warn('[notify] failed', userId, (e as Error).message);
  }
}
