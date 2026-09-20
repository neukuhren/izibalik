/** Открыть страницу оплаты: в Telegram — во внешнем браузере (для перехода в банк по СБП). */
export function openPaymentUrl(url: string): void {
  if (!url) return;
  const tg = (window as { Telegram?: { WebApp?: { openLink?: (u: string, o?: Record<string, unknown>) => void; isVersionAtLeast?: (v: string) => boolean } } })
    .Telegram?.WebApp;
  if (tg?.openLink) {
    const opts: Record<string, unknown> = {};
    if (tg.isVersionAtLeast?.('7.0')) opts.try_browser = true;
    try {
      tg.openLink(url, opts);
    } catch {
      tg.openLink(url);
    }
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
