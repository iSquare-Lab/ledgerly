// The transaction list for the month in view, grouped by day, with the type and category filters applied.
import { summarise } from '../lib/model';
import { app, money, view } from '../state';
import { dayLabel, slotOf } from '../ui/format';
import { $, esc } from '../ui/html';
import { icon, icons } from '../ui/icons';

export function renderTransactions(): void {
  const s = summarise(app.ledger, view.month);
  const cats = new Map(app.ledger.categories.map((c) => [c.id, c]));
  let list = s.transactions;
  if (view.filter !== 'all') list = list.filter((t) => t.kind === view.filter);
  const picked = view.categoryFilter;
  if (picked) list = list.filter((t) => picked.includes(t.categoryId));
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === view.filter)));
  const note = $('filter-note');
  note.hidden = !picked;
  if (picked) {
    note.innerHTML = `Showing ${esc(view.categoryLabel)} only · <button type="button" class="text-button" data-action="clear-filter">Show all categories</button>`;
  }
  if (list.length === 0) {
    $('tx-list').innerHTML = `<li class="empty"><p>No transactions here yet.</p><button type="button" class="button primary" data-action="add">Add a transaction</button></li>`;
    return;
  }
  let lastDate = '';
  $('tx-list').innerHTML = list
    .map((t) => {
      const c = cats.get(t.categoryId);
      const header = t.date !== lastDate ? `<li class="tx-day"><span>${esc(dayLabel(t.date))}</span></li>` : '';
      lastDate = t.date;
      const income = t.kind === 'income';
      const name = esc(`${t.note || c?.name || 'transaction'}, ${dayLabel(t.date)}`);
      return `${header}<li class="tx">
        <span class="tx-icon" data-slot="${slotOf(c)}">${icon(c?.icon ?? 'tag')}</span>
        <span class="tx-main"><span class="tx-note">${esc(t.note || c?.name || 'Transaction')}</span>
          <span class="tx-cat">${esc(c?.name ?? '')}${t.example ? ' · <span class="tx-example">Example</span>' : ''}</span></span>
        <span class="tx-amount${income ? ' is-income' : ''}">${income ? '+' : '−'}${esc(money(t.amount))}</span>
        <span class="tx-actions">
          <button type="button" class="icon-button tiny" data-edit="${esc(t.id)}" aria-label="Edit ${name}">${icons.edit()}</button>
          <button type="button" class="icon-button tiny" data-delete="${esc(t.id)}" aria-label="Delete ${name}">${icons.trash()}</button>
        </span>
      </li>`;
    })
    .join('');
}
