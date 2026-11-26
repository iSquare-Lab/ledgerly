// The monthly trend: stacked spending by category with income marked, plus the same numbers as a table for screen
// readers (the chart itself is hidden from them).
import { addMonths, monthOf, monthRange, summarise, type MonthKey } from '../lib/model';
import { app, money, view } from '../state';
import { trendSvg, type TrendMonth } from '../ui/charts';
import { monthName } from '../ui/format';
import { $, esc } from '../ui/html';

/** Up to six months ending with the one in view, from the first month with data, and at least three. */
function trendMonths(): MonthKey[] {
  const first = app.ledger.transactions.reduce((m, t) => (monthOf(t.date) < m ? monthOf(t.date) : m), view.month);
  const start = [addMonths(view.month, -5), first].toSorted()[1];
  return monthRange(start < addMonths(view.month, -2) ? start : addMonths(view.month, -2), view.month);
}

export function renderTrend(): void {
  const host = $('trend');
  const width = Math.max(300, Math.floor(host.clientWidth));
  const expenseCats = app.ledger.categories.filter((c) => c.kind === 'expense');
  // Neutral slot 0 ("Other" and categories past the eighth) goes last, on top of the stack.
  const slots = [...new Set(expenseCats.map((c) => c.slot))].toSorted((a, b) => (a === 0 ? 1 : b === 0 ? -1 : a - b));
  const data: TrendMonth[] = trendMonths().map((m) => {
    const s = summarise(app.ledger, m);
    const bySlot = new Map<number, number>();
    for (const x of s.byCategory) bySlot.set(x.category.slot, (bySlot.get(x.category.slot) ?? 0) + x.spent);
    return {
      month: m,
      label: monthName(m, 'short'),
      income: s.income,
      spent: s.spent,
      stack: slots.map((slot) => ({
        slot,
        label: slot ? expenseCats.find((c) => c.slot === slot)!.name : 'Other',
        amount: bySlot.get(slot) ?? 0,
      })),
    };
  });
  host.innerHTML = trendSvg(data, app.ledger.currency, width, view.month);
  renderTable(data);
}

function renderTable(data: TrendMonth[]): void {
  // One column per category that has spending in these months, so the table holds everything the chart shows.
  const columns = data[0].stack.map((seg, i) => ({ label: seg.label, i })).filter(({ i }) => data.some((d) => d.stack[i].amount > 0));
  const head = ['Income', 'Spent', ...columns.map((c) => c.label)];
  $('trend-table').innerHTML = `<caption>Monthly trend, ${esc(monthName(data[0].month))} to ${esc(monthName(data.at(-1)!.month))}: income, spending and spending by category</caption>
    <thead><tr><th scope="col">Month</th>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${data
      .map(
        (d) =>
          `<tr><th scope="row">${esc(monthName(d.month))}</th><td>${esc(money(d.income))}</td><td>${esc(money(d.spent))}</td>${columns
            .map((c) => `<td>${esc(money(d.stack[c.i].amount))}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>`;
}
