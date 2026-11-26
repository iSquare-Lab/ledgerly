// The app's state: the ledger, what is in view, saving, and re-rendering after a change.
import { exampleLedger, hasExampleData } from './lib/example';
import { formatMoney } from './lib/money';
import { addMonths, monthKey, type Kind, type Ledger, type MonthKey } from './lib/model';
import { loadLedger, saveLedger, storageAvailable } from './lib/storage';

export const now = new Date();
export const currentMonth: MonthKey = monthKey(now.getFullYear(), now.getMonth() + 1);

const ledger: Ledger = loadLedger() ?? exampleLedger(now);

export const app = {
  ledger,
  /** False when the browser refuses local storage: changes then last for this visit only. */
  storageOk: storageAvailable(),
};

// Early in a month the example's current month is thin: open on the previous, complete month instead.
const initialMonth = hasExampleData(ledger) && now.getDate() < 8 ? addMonths(currentMonth, -1) : currentMonth;

export const view = {
  month: initialMonth,
  filter: 'all' as 'all' | Kind,
  /** Category ids picked in the "Where it went" legend, or null for all. */
  categoryFilter: null as string[] | null,
  categoryLabel: '',
};

let renderAll = (): void => {};

/** Sets the function that redraws the whole page. */
export const onRender = (fn: () => void): void => {
  renderAll = fn;
};

export const render = (): void => renderAll();

/** Saves the ledger and redraws. */
export function commit(): void {
  app.storageOk = saveLedger(app.ledger);
  render();
}

/** An amount in the ledger's currency. */
export const money = (cents: number): string => formatMoney(cents, app.ledger.currency);
