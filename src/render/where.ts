// "Where it went": the spending donut and its legend, which filters the transaction list by category.
import { donutSlices, summarise } from '../lib/model';
import { app, money, view } from '../state';
import { donutSvg } from '../ui/charts';
import { monthName, plural } from '../ui/format';
import { $, esc } from '../ui/html';

export function renderWhere(): void {
  const s = summarise(app.ledger, view.month);
  const slices = donutSlices(s);
  const share = (amount: number) => (s.spent ? `${Math.round((amount / s.spent) * 100)}%` : '');
  $('where-note').textContent = s.spent ? plural(slices.length, 'category', 'categories') : '';
  const active = view.categoryFilter?.join();
  const legend = slices.length
    ? `<ul class="legend">${slices
        .map(
          (sl) => `<li><button type="button" class="legend-item${active === sl.ids.join() ? ' is-active' : ''}" data-filter-ids="${esc(sl.ids.join(','))}" data-filter-label="${esc(sl.label)}" aria-pressed="${active === sl.ids.join()}">
            <span class="swatch" data-slot="${sl.slot}"></span><span class="legend-name">${esc(sl.label)}</span>
            <span class="legend-amount">${esc(money(sl.amount))}</span><span class="legend-share">${share(sl.amount)}</span>
          </button></li>`,
        )
        .join('')}</ul>`
    : `<div class="empty"><p>No spending recorded in ${esc(monthName(view.month))} yet.</p><button type="button" class="button primary" data-action="add">Add an expense</button></div>`;
  $('where').innerHTML = `<div class="donut-wrap">${donutSvg(slices, s.spent, app.ledger.currency, 'Spent')}</div>${legend}`;
}
