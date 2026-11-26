import { describe, expect, it } from 'vitest';
import { formatMoneyCompact } from '../src/lib/money';
import { donutSvg, niceStep, trendSvg, type TrendMonth } from '../src/ui/charts';

const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const tips = (svg: string): string[][] => [...svg.matchAll(/data-tip="([^"]*)"/g)].map((m) => JSON.parse(unescape(m[1])) as string[]);
const axisLabels = (svg: string): string[] => [...svg.matchAll(/<text class="tick" [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);

describe('niceStep', () => {
  it('rounds up to 1, 2, 2.5 or 5 times a power of ten', () => {
    expect(niceStep(1)).toBe(1);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(120)).toBe(200);
    expect(niceStep(2400)).toBe(2500);
    expect(niceStep(7000)).toBe(10000);
    expect(niceStep(100000)).toBe(100000);
  });
  it('never returns less than 1', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(0.25)).toBe(1);
  });
});

describe('donutSvg', () => {
  it('draws a single category as a full ring', () => {
    const svg = donutSvg([{ label: 'Housing', slot: 1, amount: 50000, ids: ['housing'] }], 50000, 'USD', 'Spent');
    const segs = [...svg.matchAll(/<path d="([^"]*)"[^>]*class="donut-seg"/g)].map((m) => m[1]);
    expect(segs).toHaveLength(1);
    // A ring is an outer and an inner circle: two closed subpaths.
    expect(segs[0].match(/M/g)).toHaveLength(2);
    expect(svg).not.toContain('NaN');
    expect(tips(svg)).toEqual([['Housing', '$500.00 · 100% of spending']]);
  });
  it('shows an empty ring and says so when nothing was spent', () => {
    const svg = donutSvg([], 0, 'USD', 'Spent');
    expect(svg).toContain('class="donut-empty"');
    expect(svg).not.toContain('donut-seg');
    expect(svg).toContain('aria-label="No spending recorded this month"');
  });
  it('keeps category names with separators and quotes intact in the tooltip', () => {
    const svg = donutSvg(
      [
        { label: 'Rent | flat "A"', slot: 1, amount: 3000, ids: ['a'] },
        { label: 'Food', slot: 2, amount: 1000, ids: ['b'] },
      ],
      4000,
      'EUR',
      'Spent',
    );
    expect(tips(svg).map((t) => t[0])).toEqual(['Rent | flat "A"', 'Food']);
  });
});

const month = (key: string, income: number, amounts: number[]): TrendMonth => ({
  month: key,
  label: key.slice(5),
  income,
  spent: amounts.reduce((a, b) => a + b, 0),
  stack: amounts.map((amount, i) => ({ slot: i + 1, label: `Cat ${i + 1}`, amount })),
});

describe('trendSvg', () => {
  it('draws months without any money without NaN or repeated axis labels', () => {
    const svg = trendSvg([month('2026-09', 0, [0, 0]), month('2026-10', 0, [0, 0]), month('2026-11', 0, [0, 0])], 'USD', 600, '2026-11');
    expect(svg).not.toContain('NaN');
    expect(svg).not.toContain('bar-seg');
    expect(svg).not.toContain('income-tick');
    const labels = axisLabels(svg);
    expect(new Set(labels).size).toBe(labels.length);
  });
  it('stacks spending, marks and labels income, and describes each month', () => {
    const svg = trendSvg([month('2026-10', 420000, [150000, 30000]), month('2026-11', 0, [0, 12000])], 'USD', 800, '2026-11');
    expect(svg.match(/class="bar-seg"/g)).toHaveLength(3);
    expect(svg.match(/class="income-tick"/g)).toHaveLength(1);
    expect(svg).toContain('class="income-label"');
    expect(tips(svg)[0]).toEqual(['10', 'Spent $1,800.00', 'Income $4,200.00', 'Left over $2,400.00']);
    expect(tips(svg)[1][3]).toBe('Overspent $120.00');
  });
});

describe('formatMoneyCompact', () => {
  it('shortens axis amounts', () => {
    expect(formatMoneyCompact(0, 'USD')).toBe('$0');
    expect(formatMoneyCompact(25000, 'USD')).toBe('$250');
    expect(formatMoneyCompact(123400, 'USD')).toBe('$1.2K');
    expect(formatMoneyCompact(150000000, 'EUR')).toBe('€1.5M');
    expect(formatMoneyCompact(5000000, 'JPY')).toBe('¥50K');
  });
});
