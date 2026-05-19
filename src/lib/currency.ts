export type Currency = 'GBP' | 'USD' | 'EUR';

// Static reference rates relative to GBP (base). Approximate, updated 2025.
// Real-time FX would require an API call; these are good enough for indicative pricing.
const RATES: Record<Currency, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
};

const SYMBOL: Record<Currency, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

export function convertFromGBP(gbp: number, to: Currency): number {
  return +(gbp * RATES[to]).toFixed(2);
}

export function fmt(gbp: number, currency: Currency, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  const v = convertFromGBP(gbp, currency);
  return `${SYMBOL[currency]}${v.toFixed(decimals)}`;
}

export function symbol(currency: Currency): string {
  return SYMBOL[currency];
}

export const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR'];