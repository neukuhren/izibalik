// Minimal Telegram Mini App bootstrap. Safe no-op outside Telegram (browser dev).
interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  disableVerticalSwipes?(): void;
  initData?: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
}

export interface TgUser {
  id: number;
  name: string;
  handle: string;
  photoUrl: string;
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

export function getTgUser(): TgUser | null {
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!u) return null;
  return {
    id: u.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Игрок',
    handle: u.username ? '@' + u.username : '',
    photoUrl: u.photo_url || '',
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function initTelegram(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor('#05050c');
    tg.setBackgroundColor('#05050c');
    tg.disableVerticalSwipes?.();
  } catch {
    // older Telegram clients — ignore
  }
}
