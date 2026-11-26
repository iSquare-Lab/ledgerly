// CSV import (pick a file, review what will change, confirm) and export (download every transaction).
import { exportCsv, importCsv, type ImportResult } from '../lib/csv';
import { monthOf, todayIso } from '../lib/model';
import { app, commit, view } from '../state';
import { plural } from '../ui/format';
import { $, esc } from '../ui/html';
import { icons } from '../ui/icons';
import { toast } from '../ui/toast';

const MAX_BYTES = 5 * 1024 * 1024;
let pending: ImportResult | null = null;
const dialog = () => $<HTMLDialogElement>('import-dialog');

function summary(fileName: string, r: ImportResult): string {
  const n = r.transactions.length;
  const items = [
    `<li><strong>${n}</strong> ${n === 1 ? 'transaction' : 'transactions'} to import</li>`,
    r.newCategories.length
      ? `<li><strong>${r.newCategories.length}</strong> new ${r.newCategories.length === 1 ? 'category' : 'categories'}: ${esc(r.newCategories.map((c) => c.name).join(', '))}</li>`
      : '',
    r.skippedDuplicates ? `<li><strong>${r.skippedDuplicates}</strong> already in Ledgerly, skipped</li>` : '',
  ];
  const currency = r.otherCurrencies.length
    ? `<div class="import-warning"><p>${icons.alert()}The file is in ${esc(r.otherCurrencies.join(', '))}; Ledgerly uses ${esc(app.ledger.currency)}.</p>
        <p>Amounts are imported as they are, not converted. Change the currency at the top first if the whole ledger should be in ${esc(r.otherCurrencies[0])}.</p></div>`
    : '';
  const errors = r.errors.length
    ? `<div class="import-errors"><p>${icons.alert()}Some rows could not be read:</p><ul>${r.errors.map((er) => `<li>${esc(er)}</li>`).join('')}</ul></div>`
    : '';
  return `<p class="import-file">${esc(fileName)}</p><ul class="import-stats">${items.join('')}</ul>${currency}${errors}
    <p class="dialog-note">Ledgerly reads its own CSV format: date (YYYY-MM-DD), type (expense or income), category, amount and note, with an optional currency column. Files exported from Ledgerly import as they are.</p>`;
}

async function pickFile(): Promise<void> {
  const input = $<HTMLInputElement>('import-file');
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (file.size > MAX_BYTES) {
    toast('That file is larger than 5 MB.');
    return;
  }
  pending = importCsv(await file.text(), app.ledger);
  $('import-summary').innerHTML = summary(file.name, pending);
  $<HTMLButtonElement>('import-confirm').disabled = pending.transactions.length === 0;
  dialog().showModal();
}

function confirm(e: SubmitEvent): void {
  e.preventDefault();
  const r = pending;
  if (!r) return;
  pending = null;
  app.ledger = {
    ...app.ledger,
    categories: [...app.ledger.categories, ...r.newCategories],
    transactions: [...app.ledger.transactions, ...r.transactions],
  };
  dialog().close();
  const latest = r.transactions.map((t) => t.date).toSorted().at(-1);
  if (latest) view.month = monthOf(latest);
  commit();
  toast(`${plural(r.transactions.length, 'transaction')} imported.`);
}

function exportFile(): void {
  if (app.ledger.transactions.length === 0) {
    toast('There is nothing to export yet.');
    return;
  }
  const url = URL.createObjectURL(new Blob([exportCsv(app.ledger)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledgerly-${todayIso(new Date())}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function initCsv(): void {
  $('import-button').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', () => void pickFile());
  $('import-form').addEventListener('submit', confirm);
  $('export-button').addEventListener('click', exportFile);
}
