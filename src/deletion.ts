// Deleting a transaction, and undoing deletions (the toast's Undo button or Ctrl/Cmd+Z), most recent first.
import { monthOf, type Ledger, type Transaction } from './lib/model';
import { app, commit, view } from './state';
import { $ } from './ui/html';
import { toast } from './ui/toast';

/** How many deletions of this visit can be undone. */
const UNDO_LIMIT = 20;

const deleted: Transaction[] = [];

const rowButtons = () => [...document.querySelectorAll<HTMLElement>('#tx-list [data-edit]')];

/** Focus for after the list changed: the row now at `index` (or the last one), else the list heading. */
function focusRow(index: number): void {
  const rows = rowButtons();
  const row = index >= 0 && rows.length ? rows[Math.min(index, rows.length - 1)] : undefined;
  (row ?? $('tx-title')).focus();
}

export function deleteTransaction(id: string): void {
  const t = app.ledger.transactions.find((x) => x.id === id);
  if (!t) return;
  const index = rowButtons().findIndex((b) => b.dataset.edit === id);
  deleted.push(t);
  if (deleted.length > UNDO_LIMIT) deleted.shift();
  app.ledger = { ...app.ledger, transactions: app.ledger.transactions.filter((x) => x.id !== id) };
  commit();
  focusRow(index);
  toast('Transaction deleted.', { label: 'Undo', run: undoDelete, shortcut: 'Control+Z' });
}

/**
 * The transaction as it can be restored into this ledger: if its category was removed after the deletion, it goes
 * under "Other" (or another income category). Returns the category name it moved to, if it moved.
 */
function restorable(ledger: Ledger, t: Transaction): { transaction: Transaction; movedTo?: string } {
  if (ledger.categories.some((c) => c.id === t.categoryId && c.kind === t.kind)) return { transaction: t };
  const same = ledger.categories.filter((c) => c.kind === t.kind);
  const fallback = same.find((c) => c.id === (t.kind === 'income' ? 'other-income' : 'other')) ?? same[0];
  if (!fallback) return { transaction: t };
  return { transaction: { ...t, categoryId: fallback.id }, movedTo: fallback.name };
}

/** Restores the most recent deletion and shows it in its month; false when there is nothing to undo. */
export function undoDelete(): boolean {
  const last = deleted.pop();
  if (!last) return false;
  const { transaction: t, movedTo } = restorable(app.ledger, last);
  app.ledger = { ...app.ledger, transactions: [...app.ledger.transactions, t] };
  view.month = monthOf(t.date);
  // Make sure the filters do not hide it.
  if (view.filter !== 'all' && view.filter !== t.kind) view.filter = 'all';
  if (view.categoryFilter && !view.categoryFilter.includes(t.categoryId)) view.categoryFilter = null;
  commit();
  const index = rowButtons().findIndex((b) => b.dataset.edit === t.id);
  if (index >= 0) focusRow(index);
  else $('tx-title').focus();
  toast(movedTo ? `Deletion undone. Its category was removed, so it is under ${movedTo} now.` : 'Deletion undone.');
  return true;
}
