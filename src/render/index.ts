import { renderBudgets } from './budgets';
import { renderHeader } from './header';
import { renderStats } from './stats';
import { renderTransactions } from './transactions';
import { renderTrend } from './trend';
import { renderWhere } from './where';

export { renderTransactions, renderTrend, renderWhere };

/** Redraws everything from the state. */
export function renderAll(): void {
  renderHeader();
  renderStats();
  renderWhere();
  renderBudgets();
  renderTrend();
  renderTransactions();
}
