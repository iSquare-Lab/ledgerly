// "Month at a glance": income, spending, what is left and how much of the budget is used.
import { summarise } from '../lib/model';
import { money, app, view } from '../state';
import { plural } from '../ui/format';
import { $, esc } from '../ui/html';
import { icons } from '../ui/icons';

export function renderStats(): void {
  const s = summarise(app.ledger, view.month);
  const used = s.budgetTotal > 0 ? s.spent / s.budgetTotal : 0;
  const over = s.budgetTotal > 0 && s.spent > s.budgetTotal;
  const pct = Math.round(used * 100);
  const count = (kind: 'income' | 'expense') => s.transactions.filter((t) => t.kind === kind).length;
  const tiles = [
    { label: 'Income', value: money(s.income), note: `${plural(count('income'), 'payment')} in` },
    { label: 'Spent', value: money(s.spent), note: plural(count('expense'), 'expense') },
    {
      label: s.net >= 0 ? 'Left over' : 'Overspent',
      value: money(Math.abs(s.net)),
      note:
        s.income === 0 ? 'No income recorded' : s.net >= 0 ? `${Math.round((s.net / s.income) * 100)}% of income kept` : 'Spending is above income',
      tone: s.net >= 0 ? 'good' : 'bad',
    },
  ];
  $('stats').innerHTML =
    tiles
      .map(
        (t) =>
          `<div class="stat${t.tone ? ` is-${t.tone}` : ''}"><p class="stat-label">${esc(t.label)}</p><p class="stat-value">${esc(t.value)}</p><p class="stat-note">${esc(t.note)}</p></div>`,
      )
      .join('') +
    `<div class="stat"><p class="stat-label">Budget used</p><p class="stat-value">${s.budgetTotal ? `${pct}%` : '—'}</p>
      <div class="meter${over ? ' is-over' : ''}" role="meter" aria-label="Budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, pct)}" aria-valuetext="${pct}% of ${esc(money(s.budgetTotal))}"><span class="meter-fill"></span></div>
      <p class="stat-note">${over ? `${icons.alert()}Over by ${esc(money(s.spent - s.budgetTotal))}` : `of ${esc(money(s.budgetTotal))} planned`}</p></div>`;
  const fill = document.querySelector<HTMLElement>('#stats .meter-fill');
  if (fill) fill.style.width = `${Math.min(100, pct)}%`;
}
