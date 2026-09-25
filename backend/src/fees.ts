/** Комиссия сервиса при оплате (Platega и отображение на витрине). */
export const SERVICE_FEE_PCT = 8;

export function serviceFeeRub(subtotalRub: number): number {
  if (subtotalRub <= 0) return 0;
  return Math.round(subtotalRub * (SERVICE_FEE_PCT / 100));
}

export function totalWithFeeRub(subtotalRub: number): number {
  return Math.max(1, subtotalRub + serviceFeeRub(subtotalRub));
}
