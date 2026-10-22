import { env } from './env.js';

/** Комиссия сервиса при оплате (LAVA и отображение на витрине). */
export const SERVICE_FEE_PCT = env.serviceFeePct;

export function serviceFeeRub(subtotalRub: number): number {
  if (subtotalRub <= 0) return 0;
  return Math.round(subtotalRub * (SERVICE_FEE_PCT / 100));
}

export function totalWithFeeRub(subtotalRub: number): number {
  return Math.max(1, subtotalRub + serviceFeeRub(subtotalRub));
}

/** LAVA добавляет комиссию на своей странице оплаты — в счёт уходит только сумма товара. */
export function isLavaFeeOnCheckout(): boolean {
  return env.paymentProvider === 'lava';
}

export function chargeAmountRub(subtotalRub: number): number {
  if (isLavaFeeOnCheckout()) return Math.max(1, subtotalRub);
  return totalWithFeeRub(subtotalRub);
}
