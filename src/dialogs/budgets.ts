// The budgets dialog: rename, add and remove expense categories and set their monthly budgets. Nothing changes until
// Save, and every row is checked first: a name is required and must be unique (ignoring case), and a budget must be
// an amount or empty.
import { amountInputText, parseAmount } from '../lib/money';
import { freeSlot, newId, type Category } from '../lib/model';
import { app, commit } from '../state';
import { currencySymbol } from '../ui/format';
import { $, esc } from '../ui/html';
import { icons } from '../ui/icons';
import { toast } from '../ui/toast';

interface DraftRow {
  category: Category;
  /** What is typed, kept as text until Save. */
  name: string;
  budget: string;
  nameError: string;
  budgetError: string;
}

let rows: DraftRow[] = [];
const dialog = () => $<HTMLDialogElement>('budget-dialog');

const rowFor = (category: Category): DraftRow => ({
  category,
  name: category.name,
  budget: category.budget ? amountInputText(category.budget) : '',
  nameError: '',
  budgetError: '',
});

function renderRows(): void {
  const used = new Set(app.ledger.transactions.map((t) => t.categoryId));
  const symbol = esc(currencySymbol(app.ledger.currency));
  $('budget-edit').innerHTML = rows
    .map((r) => {
      const id = esc(r.category.id);
      const errorId = `be-error-${id}`;
      const error = [r.nameError, r.budgetError].filter(Boolean).join(' ');
      const describedBy = error ? ` aria-describedby="${errorId}"` : '';
      const inUse = used.has(r.category.id) || r.category.id === 'other';
      return `<li class="be-row">
        <span class="swatch" data-slot="${r.category.slot}"></span>
        <label class="field grow"><span class="sr-only">Category name</span><input data-name="${id}" value="${esc(r.name)}" maxlength="40" autocomplete="off"${r.nameError ? ' aria-invalid="true"' : ''}${describedBy} /></label>
        <label class="field budget-field"><span class="sr-only">${esc(r.name || 'Category')} monthly budget</span><span class="amount-input"><span class="amount-symbol">${symbol}</span><input data-budget="${id}" inputmode="decimal" value="${esc(r.budget)}" placeholder="None" autocomplete="off"${r.budgetError ? ' aria-invalid="true"' : ''}${describedBy} /></span></label>
        <button type="button" class="icon-button tiny" data-remove="${id}" aria-label="Remove ${esc(r.name || 'category')}"${inUse ? ' disabled title="In use: categories with transactions stay"' : ''}>${icons.trash()}</button>
        ${error ? `<p class="field-error be-error" id="${errorId}">${esc(error)}</p>` : ''}
      </li>`;
    })
    .join('');
}

/** Copies what is typed into the draft rows. */
function sync(): void {
  for (const r of rows) {
    const name = document.querySelector<HTMLInputElement>(`#budget-edit [data-name="${CSS.escape(r.category.id)}"]`);
    const budget = document.querySelector<HTMLInputElement>(`#budget-edit [data-budget="${CSS.escape(r.category.id)}"]`);
    if (name) r.name = name.value;
    if (budget) r.budget = budget.value;
  }
}

const parseBudget = (text: string): number | null => (text.trim() === '' ? 0 : parseAmount(text));

/** Checks every row and records its errors; true when all rows are fine. */
function validate(): boolean {
  const seen = new Set<string>();
  for (const r of rows) {
    const name = r.name.trim();
    const key = name.toLowerCase();
    r.nameError = !name ? 'Give this category a name.' : seen.has(key) ? `There is already a category called “${name}”.` : '';
    seen.add(key);
    const cents = parseBudget(r.budget);
    r.budgetError = cents === null || cents < 0 ? 'Use an amount like 250 or 250.50, or leave the budget empty.' : '';
  }
  return rows.every((r) => !r.nameError && !r.budgetError);
}

function open(): void {
  rows = app.ledger.categories.filter((c) => c.kind === 'expense').map((c) => rowFor({ ...c }));
  $('budget-error').textContent = '';
  $('new-category-error').textContent = '';
  $<HTMLInputElement>('new-category').value = '';
  renderRows();
  dialog().showModal();
}

function addCategory(): void {
  sync();
  const input = $<HTMLInputElement>('new-category');
  const name = input.value.trim();
  const error = !name
    ? 'Type a name for the new category.'
    : rows.some((r) => r.name.trim().toLowerCase() === name.toLowerCase())
      ? `There is already a category called “${name}”.`
      : '';
  $('new-category-error').textContent = error;
  if (error) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  if (error) return input.focus();
  const expense = rows.map((r) => r.category);
  rows.push(rowFor({ id: `c-${newId()}`, name, kind: 'expense', budget: 0, slot: freeSlot(expense), icon: 'tag' }));
  input.value = '';
  renderRows();
  document.querySelector<HTMLInputElement>('#budget-edit li:last-child [data-budget]')?.focus();
}

function save(e: SubmitEvent): void {
  e.preventDefault();
  sync();
  const ok = validate();
  renderRows();
  if (!ok) {
    $('budget-error').textContent = 'Some categories need fixing: see the messages under them.';
    document.querySelector<HTMLInputElement>('#budget-edit [aria-invalid="true"]')?.focus();
    return;
  }
  const expense = rows.map((r) => ({ ...r.category, name: r.name.trim(), budget: parseBudget(r.budget) ?? 0 }));
  app.ledger = { ...app.ledger, categories: [...expense, ...app.ledger.categories.filter((c) => c.kind === 'income')] };
  dialog().close();
  commit();
  toast('Budgets saved.');
}

export function initBudgetDialog(): void {
  $('edit-budgets').addEventListener('click', open);
  $('add-category').addEventListener('click', addCategory);
  $('new-category').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    }
  });
  $('budget-edit').addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-remove]')?.dataset.remove;
    if (!id) return;
    sync();
    rows = rows.filter((r) => r.category.id !== id);
    renderRows();
    $('add-category').focus();
  });
  $('budget-form').addEventListener('submit', save);
}
