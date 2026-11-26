// @vitest-environment happy-dom
// The page in a simulated browser: deleting and undoing, focus, dialog checks, storage and import messages.
import html from '../index.html?raw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyLedger, monthKey, type Ledger } from '../src/lib/model';

const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[\s\S]*?<\/script>/g, '');

const today = new Date();
const month = monthKey(today.getFullYear(), today.getMonth() + 1);

function ledger(): Ledger {
  const l = emptyLedger('USD');
  l.transactions = [
    { id: 't1', date: `${month}-01`, kind: 'expense', categoryId: 'groceries', amount: 4200, note: 'Market' },
    { id: 't2', date: `${month}-01`, kind: 'expense', categoryId: 'dining', amount: 450, note: 'Coffee' },
    { id: 't3', date: `${month}-01`, kind: 'income', categoryId: 'salary', amount: 300000, note: 'Salary' },
  ];
  return l;
}

// main.ts adds listeners to document; remove them between tests so each test has one copy of the page.
const listeners: [string, EventListenerOrEventListenerObject][] = [];
const addListener = document.addEventListener.bind(document);

async function boot(data: Ledger | null = ledger()): Promise<void> {
  for (const [type, fn] of listeners.splice(0)) document.removeEventListener(type, fn);
  document.addEventListener = ((type: string, fn: EventListenerOrEventListenerObject, options?: AddEventListenerOptions) => {
    listeners.push([type, fn]);
    addListener(type, fn, options);
  }) as typeof document.addEventListener;
  document.body.innerHTML = body;
  localStorage.clear();
  if (data) localStorage.setItem('ledgerly.v1', JSON.stringify(data));
  vi.resetModules();
  await import('../src/main');
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const editButtons = () => [...document.querySelectorAll<HTMLButtonElement>('#tx-list [data-edit]')];
const click = (el: Element | null) => (el as HTMLElement).click();
const ctrlZ = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
const nameInput = (id: string) => document.querySelector<HTMLInputElement>(`#budget-edit [data-name="${id}"]`)!;
const budgetInput = (id: string) => document.querySelector<HTMLInputElement>(`#budget-edit [data-budget="${id}"]`)!;
const saved = (): Ledger => JSON.parse(localStorage.getItem('ledgerly.v1')!) as Ledger;

beforeEach(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('deleting a transaction', () => {
  it('moves focus to the next row and offers Undo in the toast', async () => {
    await boot();
    const before = editButtons().map((b) => b.dataset.edit);
    click(document.querySelector(`[data-delete="${before[0]}"]`));
    expect(editButtons().map((b) => b.dataset.edit)).toEqual(before.slice(1));
    expect(document.activeElement).toBe(editButtons()[0]);
    expect($('toast-text').textContent).toBe('Transaction deleted.');
    const undo = $<HTMLButtonElement>('toast-action');
    expect(undo.hidden).toBe(false);
    expect(undo.textContent).toBe('Undo');
    click(undo);
    expect(editButtons().map((b) => b.dataset.edit)).toEqual(before);
    expect($('toast-text').textContent).toBe('Deletion undone.');
    expect(undo.hidden).toBe(true);
  });

  it('focuses the list heading when the last row goes, and Ctrl+Z still undoes', async () => {
    const one = ledger();
    one.transactions = one.transactions.slice(0, 1);
    await boot(one);
    click(document.querySelector('[data-delete="t1"]'));
    expect(editButtons()).toHaveLength(0);
    expect(document.activeElement).toBe($('tx-title'));
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(editButtons().map((b) => b.dataset.edit)).toEqual(['t1']);
  });
});

describe('undoing deletions', () => {
  it('undoes several deletions, most recent first, even after the toast is gone', async () => {
    await boot();
    click(document.querySelector('[data-delete="t1"]'));
    click(document.querySelector('[data-delete="t2"]'));
    expect(saved().transactions.map((t) => t.id)).toEqual(['t3']);
    ctrlZ();
    expect(saved().transactions.map((t) => t.id).toSorted()).toEqual(['t2', 't3']);
    ctrlZ();
    expect(saved().transactions.map((t) => t.id).toSorted()).toEqual(['t1', 't2', 't3']);
    expect($('toast-text').textContent).toBe('Deletion undone.');
  });

  it('shows the restored transaction in its own month', async () => {
    await boot();
    const title = $('month-title').textContent;
    click(document.querySelector('[data-delete="t1"]'));
    click($('prev-month'));
    expect($('month-title').textContent).not.toBe(title);
    ctrlZ();
    expect($('month-title').textContent).toBe(title);
    expect(document.activeElement).toBe(document.querySelector('[data-edit="t1"]'));
  });

  it('puts a transaction whose category was removed meanwhile under Other', async () => {
    const l = ledger();
    l.categories.push({ id: 'pets', name: 'Pets', kind: 'expense', budget: 0, slot: 0, icon: 'tag' });
    l.transactions.push({ id: 't4', date: `${month}-02`, kind: 'expense', categoryId: 'pets', amount: 2500, note: 'Cat food' });
    await boot(l);
    click(document.querySelector('[data-delete="t4"]'));
    click($('edit-budgets'));
    click(document.querySelector('#budget-edit [data-remove="pets"]'));
    $<HTMLFormElement>('budget-form').requestSubmit();
    expect(saved().categories.some((c) => c.id === 'pets')).toBe(false);
    ctrlZ();
    expect(saved().transactions.find((t) => t.id === 't4')?.categoryId).toBe('other');
    expect($('toast-text').textContent).toContain('under Other');
  });
});

describe('the add dialog', () => {
  it('shows a bad amount under the amount field', async () => {
    await boot();
    click($('add-button'));
    $<HTMLInputElement>('tx-amount').value = '0';
    $<HTMLFormElement>('tx-form').requestSubmit();
    const amount = $<HTMLInputElement>('tx-amount');
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    expect($(amount.getAttribute('aria-describedby')!).textContent).toContain('amount above zero');
    expect($('tx-amount-error').previousElementSibling?.contains(amount)).toBe(true);
  });
});

describe('the budgets dialog', () => {

  it('refuses an empty or duplicate name with an error under the row', async () => {
    await boot();
    click($('edit-budgets'));
    nameInput('dining').value = '  ';
    nameInput('transport').value = 'groceries';
    $<HTMLFormElement>('budget-form').requestSubmit();
    expect($<HTMLDialogElement>('budget-dialog').open).toBe(true);
    expect(nameInput('dining').getAttribute('aria-invalid')).toBe('true');
    expect($(nameInput('dining').getAttribute('aria-describedby')!).textContent).toContain('name');
    expect($(nameInput('transport').getAttribute('aria-describedby')!).textContent).toContain('already a category');
    expect(saved().categories.find((c) => c.id === 'dining')!.name).toBe('Dining out');
  });

  it('keeps cents in a budget: 250.50 shows as 250.50 and saves unchanged', async () => {
    const l = ledger();
    l.categories.find((c) => c.id === 'groceries')!.budget = 25050;
    await boot(l);
    click($('edit-budgets'));
    expect(budgetInput('groceries').value).toBe('250.50');
    $<HTMLFormElement>('budget-form').requestSubmit();
    expect(saved().categories.find((c) => c.id === 'groceries')!.budget).toBe(25050);
  });
});

describe('storage', () => {
  it('shows one lasting note when the browser refuses storage', async () => {
    const blocked = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      await boot(null);
      expect($('storage-note').hidden).toBe(false);
      $<HTMLSelectElement>('currency').value = 'EUR';
      $('currency').dispatchEvent(new Event('change'));
      expect($('toast-text').textContent).not.toContain('storage');
    } finally {
      blocked.mockRestore();
    }
  });
});

describe('import', () => {
  it('counts one transaction in the singular and warns about another currency', async () => {
    await boot();
    const input = $<HTMLInputElement>('import-file');
    const file = new File(['date,type,category,amount,currency,note\n2026-01-05,expense,Groceries,12.00,EUR,Market\n'], 'one.csv', { type: 'text/csv' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect($<HTMLDialogElement>('import-dialog').open).toBe(true));
    expect($('import-summary').textContent).toContain('1 transaction to import');
    expect($('import-summary').textContent).toContain('The file is in EUR; Ledgerly uses USD.');
    $<HTMLFormElement>('import-form').requestSubmit();
    expect($('toast-text').textContent).toBe('1 transaction imported.');
  });
});
