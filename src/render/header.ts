// The top bar (month and currency) and the banners above the stats.
import { hasExampleData } from '../lib/example';
import { addMonths } from '../lib/model';
import { app, currentMonth, view } from '../state';
import { monthName } from '../ui/format';
import { $ } from '../ui/html';

export function renderHeader(): void {
  $('month-title').textContent = monthName(view.month);
  $<HTMLButtonElement>('next-month').disabled = view.month >= addMonths(currentMonth, 1);
  $<HTMLSelectElement>('currency').value = app.ledger.currency;
  $('example-banner').hidden = !hasExampleData(app.ledger);
  $('storage-note').hidden = app.storageOk;
}
