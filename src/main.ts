// Ledgerly: wires the page together. State lives in state.ts, drawing in render/, dialogs in dialogs/.
import './styles.css';
import { undoDelete, deleteTransaction } from './deletion';
import { initBudgetDialog } from './dialogs/budgets';
import { initCsv } from './dialogs/csv';
import { initTransactionDialog, openTransaction } from './dialogs/transaction';
import { clearExampleData } from './lib/example';
import { CURRENCIES } from './lib/money';
import { addMonths, type Kind } from './lib/model';
import { renderAll, renderTransactions, renderTrend, renderWhere } from './render';
import { app, commit, currentMonth, onRender, render, view } from './state';
import { $, esc } from './ui/html';
import { icons, logo } from './ui/icons';
import { initTheme } from './ui/theme';
import { initToast, toast } from './ui/toast';
import { initTooltip } from './ui/tooltip';

// Static icons and the currency list.
$('brand-mark').innerHTML = logo(30);
$('prev-month').innerHTML = icons.left();
$('next-month').innerHTML = icons.right();
$('add-icon').innerHTML = icons.plus();
$('import-icon').innerHTML = icons.upload();
$('export-icon').innerHTML = icons.download();
$('storage-icon').innerHTML = icons.alert();
document.querySelectorAll<HTMLElement>('[data-close].icon-button').forEach((b) => (b.innerHTML = icons.close()));
$('currency').innerHTML = CURRENCIES.map((c) => `<option value="${c.code}" title="${esc(c.name)}">${c.code}</option>`).join('');

initTheme();
initTooltip();
initToast();
initTransactionDialog();
initBudgetDialog();
initCsv();

$('currency').addEventListener('change', () => {
  app.ledger = { ...app.ledger, currency: $<HTMLSelectElement>('currency').value };
  commit();
});
$('prev-month').addEventListener('click', () => {
  view.month = addMonths(view.month, -1);
  render();
});
$('next-month').addEventListener('click', () => {
  view.month = addMonths(view.month, 1);
  render();
});
$('add-button').addEventListener('click', () => openTransaction());
$('clear-example').addEventListener('click', () => {
  app.ledger = clearExampleData(app.ledger);
  view.categoryFilter = null;
  view.month = currentMonth;
  commit();
  toast('Example data cleared. Add your first expense with the Add button.');
  $('add-button').focus();
});

// Buttons inside rendered content are handled here, by delegation.
document.addEventListener('click', (e) => {
  const target = e.target as Element;
  if (target.closest('[data-close]')) {
    target.closest('dialog')?.close();
    return;
  }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'add') return openTransaction();
  if (action === 'clear-filter') {
    view.categoryFilter = null;
    render();
    $('tx-title').focus();
    return;
  }
  const edit = target.closest<HTMLElement>('[data-edit]')?.dataset.edit;
  if (edit) {
    const t = app.ledger.transactions.find((x) => x.id === edit);
    if (t) openTransaction(t);
    return;
  }
  const del = target.closest<HTMLElement>('[data-delete]')?.dataset.delete;
  if (del) return deleteTransaction(del);
  const filter = target.closest<HTMLElement>('[data-filter]')?.dataset.filter;
  if (filter) {
    view.filter = filter as 'all' | Kind;
    renderTransactions();
    return;
  }
  const legend = target.closest<HTMLElement>('[data-filter-ids]');
  if (legend) {
    const ids = (legend.dataset.filterIds ?? '').split(',');
    const same = view.categoryFilter?.join() === ids.join();
    view.categoryFilter = same ? null : ids;
    view.categoryLabel = legend.dataset.filterLabel ?? '';
    view.filter = 'all';
    renderWhere();
    renderTransactions();
    if (!same) $('tx-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const monthBar = target.closest('[data-month]');
  if (monthBar) {
    view.month = monthBar.getAttribute('data-month') ?? view.month;
    render();
  }
});

// Ctrl/Cmd+Z undoes the last deletion, except while typing in a field (where it undoes the typing).
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !(e.target as Element).closest('input, textarea, select')) {
    if (undoDelete()) e.preventDefault();
  }
});

onRender(renderAll);
new ResizeObserver(() => renderTrend()).observe($('trend'));
render();
