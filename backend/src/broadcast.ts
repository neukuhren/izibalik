import { allUserIds, buyerUserIds, countAllUsers, countBuyers } from './db.js';

export interface BroadcastButton {
  text: string;
  url: string;
}
type BcSender = (userId: number, text: string, button: BroadcastButton | null) => Promise<void>;

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

export function startBroadcast(text: string, audience: Audience, button: BroadcastButton | null): { ok: boolean; total: number; error?: string } {
  if (status.running) return { ok: false, total: 0, error: 'Рассылка уже идёт' };
  if (!sender) return { ok: false, total: 0, error: 'Бот не запущен' };
  const ids = recipients(audience);
  status = { running: true, total: ids.length, sent: 0, failed: 0 };
  void run(ids, text, button);
  return { ok: true, total: ids.length };
}

async function run(ids: number[], text: string, button: BroadcastButton | null): Promise<void> {
  const send = sender!;
  for (const id of ids) {
    try {
      await send(id, text, button);
      status.sent++;
    } catch {
      status.failed++;
    }
    await new Promise((r) => setTimeout(r, 40)); // ~25 сообщений/сек
  }
  status.running = false;
}
