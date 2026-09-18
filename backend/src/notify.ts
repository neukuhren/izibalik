// Развязка отправки сообщений из orders.ts и бота (без циклических импортов).
type Sender = (userId: number, text: string) => Promise<void>;

let sender: Sender | null = null;

export function setSender(fn: Sender): void {
  sender = fn;
}

export async function notifyUser(userId: number, text: string): Promise<void> {
  if (!sender) return;
  try {
    await sender(userId, text);
  } catch {
    /* не роняем бизнес-логику из-за ошибки доставки */
  }
}
