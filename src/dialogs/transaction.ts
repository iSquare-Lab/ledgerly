// The add and edit transaction dialog.
import { amountInputText, parseAmount } from '../lib/money';
import { isValidDate, monthOf, newId, todayIso, type Kind, type Transaction } from '../lib/model';
import { deleteTransaction } from '../deletion';
import { app, commit, currentMonth, money, now, view } from '../state';
import { currencySymbol } from '../ui/format';
import { $, esc } from '../ui/html';
import { toast } from '../ui/toast';

const dialog = () => $<HTMLDialogElement>('tx-dialog');
const amountInput = () => $<HTMLInputElement>('tx-amount');
const dateInput = () => $<HTMLInputElement>('tx-date');
let editingId: string | null = null;

const kindValue = (): Kind => (document.querySelector<HTMLInputElement>('input[name=kind]:checked')?.value as Kind) ?? 'expense';

function fillCategories(kind: Kind, selected?: string): void {
  const sel = $<HTMLSelectElement>('tx-category');
  sel.innerHTML = app.ledger.categories
    .filter((c) => c.kind === kind)
    .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
    .join('');
  if (selected && app.ledger.categories.some((c) => c.id === selected && c.kind === kind)) sel.value = selected;
}

/** Today in the current month; for another month, its last day if it is past, else its first. */
function defaultDate(): string {
  const today = todayIso(now);
  if (monthOf(today) === view.month) return today;
  if (view.month < currentMonth) {
    const [y, m] = view.month.split('-').map(Number);
    return `${view.month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
  }
  return `${view.month}-01`;
}

/** Shows (or clears, with '') the error under one field, tied to it with aria-describedby. */
function fieldError(input: HTMLInputElement, message: string): void {
  const error = $(`${input.id}-error`);
  error.textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

export function openTransaction(t?: Transaction, kind: Kind = 'expense'): void {
  editingId = t?.id ?? null;
  $('tx-dialog-title').textContent = t ? 'Edit transaction' : 'Add transaction';
  const k = t?.kind ?? kind;
  document.querySelectorAll<HTMLInputElement>('input[name=kind]').forEach((r) => (r.checked = r.value === k));
  fillCategories(k, t?.categoryId);
  amountInput().value = t ? amountInputText(t.amount) : '';
  dateInput().value = t?.date ?? defaultDate();
  $<HTMLInputElement>('tx-note').value = t?.note ?? '';
  $('amount-symbol').textContent = currencySymbol(app.ledger.currency);
  fieldError(amountInput(), '');
  fieldError(dateInput(), '');
  $('tx-delete').hidden = !t;
  dialog().showModal();
  amountInput().focus();
}

function save(e: SubmitEvent): void {
  e.preventDefault();
  const amount = parseAmount(amountInput().value);
  const date = dateInput().value;
  const amountOk = amount !== null && amount > 0;
  fieldError(amountInput(), amountOk ? '' : 'Enter an amount above zero, like 12.50.');
  fieldError(dateInput(), isValidDate(date) ? '' : 'Choose a date.');
  if (!amountOk) return amountInput().focus();
  if (!isValidDate(date)) return dateInput().focus();
  const record: Transaction = {
    id: editingId ?? newId(),
    date,
    kind: kindValue(),
    categoryId: $<HTMLSelectElement>('tx-category').value,
    amount,
    note: $<HTMLInputElement>('tx-note').value.trim().slice(0, 120),
  };
  const editing = editingId;
  if (editing) app.ledger = { ...app.ledger, transactions: app.ledger.transactions.map((t) => (t.id === editing ? record : t)) };
  else app.ledger = { ...app.ledger, transactions: [...app.ledger.transactions, record] };
  dialog().close();
  view.month = monthOf(date);
  commit();
  toast(editing ? 'Transaction updated.' : `${record.kind === 'income' ? 'Income' : 'Expense'} of ${money(record.amount)} added.`);
}

export function initTransactionDialog(): void {
  document.querySelectorAll<HTMLInputElement>('input[name=kind]').forEach((r) => r.addEventListener('change', () => fillCategories(kindValue())));
  amountInput().addEventListener('input', () => fieldError(amountInput(), ''));
  dateInput().addEventListener('input', () => fieldError(dateInput(), ''));
  $('tx-form').addEventListener('submit', save);
  $('tx-delete').addEventListener('click', () => {
    const id = editingId;
    dialog().close();
    if (id) deleteTransaction(id);
  });
}
