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
  return convertCurrency(gbp, 'GBP', to);
}

export function isCurrency(value: string): value is Currency {
  return value === 'GBP' || value === 'USD' || value === 'EUR';
}

/** Convert from the original currency, never from a previously displayed amount. */
export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  return +(amount / RATES[from] * RATES[to]).toFixed(2);
}

export function formatCurrency(amount: number, from: string, to: Currency): string {
  if (!isCurrency(from)) return `${from} ${amount.toFixed(2)} (conversion unavailable)`;
  return `${SYMBOL[to]}${convertCurrency(amount, from, to).toFixed(2)}`;
}

/** Structured catalogue prices take precedence; unknown prices stay unknown. */
export function reagentPriceGBP(r: { unitPrice?: number; priceCurrency?: Currency; price: string }): number | null {
  if (r.unitPrice != null && r.priceCurrency) return convertCurrency(r.unitPrice, r.priceCurrency, 'GBP');
  const match = r.price.match(/(GBP|USD|EUR|£|\$|€)\s*([\d,]+(?:\.\d+)?)/);
  if (!match) return null;
  const from = ({ '£': 'GBP', '$': 'USD', '€': 'EUR' } as Record<string, Currency>)[match[1]] ?? match[1];
  return isCurrency(from) ? convertCurrency(Number(match[2].replace(/,/g, '')), from, 'GBP') : null;
}

export function formatReagentPrice(r: { unitPrice?: number; priceCurrency?: Currency; price: string }, to: Currency): string {
  const gbp = reagentPriceGBP(r);
  if (gbp == null) return r.price;
  const suffix = r.price.includes('/') ? ` / ${r.price.split('/').slice(1).join('/').trim()}` : '';
  return `${fmt(gbp, to)}${suffix}`;
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