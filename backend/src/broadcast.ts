import { allUserIds, buyerUserIds, countAllUsers, countBuyers } from './db.js';

export interface BroadcastButton {
  text: string;
  url: string;
}

export interface BroadcastPayload {
  text: string;
  button: BroadcastButton | null;
  /** Локальный путь к файлу изображения (после загрузки в админке). */
  imagePath: string | null;
}

type BcSender = (userId: number, payload: BroadcastPayload) => Promise<void>;

let sender: BcSender | null = null;
export function setBroadcastSender(fn: BcSender): void {
  sender = fn;
}

export type Audience = 'all' | 'buyers' | 'nobuy';

export function audienceCounts(): Record<Audience, number> {
  const all = (countAllUsers.get() as { n: number }).n;
  const buyers = (countBuyers.get() as { n: number }).n;
  return { all, buyers, nobuy: Math.max(0, all - buyers) };
}

function recipients(audience: Audience): number[] {
  if (audience === 'buyers') return (buyerUserIds.all() as { id: number }[]).map((r) => r.id);
  const all = (allUserIds.all() as { id: number }[]).map((r) => r.id);
  if (audience === 'all') return all;
  const buyers = new Set((buyerUserIds.all() as { id: number }[]).map((r) => r.id));
  return all.filter((id) => !buyers.has(id));
}

export interface BcStatus {
  running: boolean;
  total: number;
  sent: number;
  failed: number;
}
let status: BcStatus = { running: false, total: 0, sent: 0, failed: 0 };

export function broadcastStatus(): BcStatus {
  return status;
}

/** Пауза между получателями: запас под лимиты Telegram (фото — медленнее текста). */
const BROADCAST_DELAY_MS = 150;

export function startBroadcast(
  text: string,
  audience: Audience,
  button: BroadcastButton | null,
  imagePath: string | null,
): { ok: boolean; total: number; error?: string } {
  if (status.running) return { ok: false, total: 0, error: 'Рассылка уже идёт' };
  if (!sender) return { ok: false, total: 0, error: 'Бот не запущен' };
  const ids = recipients(audience);
  status = { running: true, total: ids.length, sent: 0, failed: 0 };
  void run(ids, { text, button, imagePath });
  return { ok: true, total: ids.length };
}

async function run(ids: number[], payload: BroadcastPayload): Promise<void> {
  const send = sender!;
  for (const id of ids) {
    try {
      await send(id, payload);
      status.sent++;
    } catch {
      status.failed++;
    }
    await new Promise((r) => setTimeout(r, BROADCAST_DELAY_MS));
  }
  status.running = false;
}
