// Deleting a transaction, and undoing the last deletion (the toast's Undo button or Ctrl/Cmd+Z).
import type { Transaction } from './lib/model';
import { app, commit } from './state';
import { $ } from './ui/html';
import { toast } from './ui/toast';

let lastDeleted: Transaction | null = null;

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
  lastDeleted = t;
  app.ledger = { ...app.ledger, transactions: app.ledger.transactions.filter((x) => x.id !== id) };
  commit();
  focusRow(index);
  toast('Transaction deleted.', { label: 'Undo', run: undoDelete, shortcut: 'Control+Z' });
}

/** Restores the last deleted transaction; false when there is nothing to undo. */
export function undoDelete(): boolean {
  const t = lastDeleted;
  if (!t) return false;
  lastDeleted = null;
  app.ledger = { ...app.ledger, transactions: [...app.ledger.transactions, t] };
  commit();
  const index = rowButtons().findIndex((b) => b.dataset.edit === t.id);
  if (index >= 0) focusRow(index);
  else $('tx-title').focus();
  toast('Deletion undone.');
  return true;
}
