import { Bot, InlineKeyboard } from 'grammy';
import { env } from './env.js';
import { upsertUser, now } from './db.js';
import { setSender } from './notify.js';
import { setBroadcastSender, type BroadcastButton } from './broadcast.js';

let bot: Bot | null = null;

export function getBot(): Bot | null {
  return bot;
}

export async function startBot(): Promise<void> {
  if (!env.botToken) {
    console.warn('[bot] BOT_TOKEN не задан — бот не запущен (API работает).');
    return;
  }
  bot = new Bot(env.botToken);

  bot.command('start', async (ctx) => {
    const u = ctx.from;
    if (u) {
      upsertUser.run({
        id: u.id,
        handle: u.username ? '@' + u.username : [u.first_name, u.last_name].filter(Boolean).join(' '),
        name: [u.first_name, u.last_name].filter(Boolean).join(' '),
        username: u.username ?? null,
        ts: now(),
      });
    }
    const kb = env.miniAppUrl
      ? new InlineKeyboard().webApp('🎮 Открыть магазин UC', env.miniAppUrl)
      : undefined;
    await ctx.reply(
      'IZIBALIK — PUBG UC 🎮\n\nБыстрое пополнение UC, Prime, Elite Pass и NC по лучшему курсу.\nНажми кнопку ниже, чтобы открыть магазин.',
      { reply_markup: kb },
    );
  });

  // Отправка уведомлений о заказах.
  setSender(async (userId: number, text: string) => {
    if (!bot) return;
    await bot.api.sendMessage(userId, text);
  });

  // Отправка рассылки (с опциональной inline-кнопкой).
  setBroadcastSender(async (userId: number, text: string, button: BroadcastButton | null) => {
    if (!bot) return;
    const kb = button ? new InlineKeyboard().url(button.text, button.url) : undefined;
    await bot.api.sendMessage(userId, text, { reply_markup: kb });
  });

  // Long polling (как в оригинале). Для webhook — заменить на bot.api.setWebhook + grammyWebhook.
  // Ошибка запуска бота (напр. неверный токен) не должна ронять API-сервер.
  bot.catch((err) => console.error('[bot] runtime error:', err.message));
  bot
    .start({ onStart: (info) => console.log(`[bot] @${info.username} запущен (long polling)`) })
    .catch((err) => console.error('[bot] не удалось запустить (API продолжает работать):', err?.message ?? err));
}
