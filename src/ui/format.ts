// Labels for months, days, counts and currency symbols (English, like the rest of the interface).
import type { Category, MonthKey } from '../lib/model';

export const monthName = (key: MonthKey, style: 'long' | 'short' = 'long'): string => {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
};

export const dayLabel = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
};

/** "1 expense", "3 expenses"; pass the plural for irregular words. */
export const plural = (n: number, word: string, many = `${word}s`): string => `${n} ${n === 1 ? word : many}`;

/** The colour slot of a transaction's icon: its category's for expenses, the accent (-1) for income. */
export const slotOf = (c: Category | undefined): number => (c && c.kind === 'expense' ? c.slot : -1);

export const currencySymbol = (currency: string): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value ?? currency;
