// The budgets card: spending against each category's monthly budget.
import { summarise } from '../lib/model';
import { app, money, view } from '../state';
import { $, esc } from '../ui/html';
import { icons } from '../ui/icons';

export function renderBudgets(): void {
  const s = summarise(app.ledger, view.month);
  const rows = s.byCategory.filter((x) => x.budget > 0 || x.spent > 0);
  $('budgets').innerHTML = rows.length
    ? rows
        .map((x) => {
          const pct = x.budget ? (x.spent / x.budget) * 100 : 100;
          const over = x.budget > 0 && x.spent > x.budget;
          const status = !x.budget
            ? '<span class="b-status">No budget</span>'
            : over
              ? `<span class="b-status is-over">${icons.alert()}Over by ${esc(money(x.spent - x.budget))}</span>`
              : `<span class="b-status">${esc(money(x.budget - x.spent))} left</span>`;
          return `<li class="budget">
            <div class="b-top"><span class="b-name"><span class="swatch" data-slot="${x.category.slot}"></span>${esc(x.category.name)}</span>
              <span class="b-amounts"><strong>${esc(money(x.spent))}</strong>${x.budget ? ` of ${esc(money(x.budget))}` : ''}</span></div>
            <div class="b-track${over ? ' is-over' : ''}" role="meter" aria-label="${esc(x.category.name)} budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, Math.round(pct))}" aria-valuetext="${esc(`${money(x.spent)} of ${x.budget ? money(x.budget) : 'no budget'}`)}">
              <span class="b-fill" data-slot="${x.category.slot}" data-pct="${Math.min(100, pct).toFixed(1)}"></span></div>
            ${status}
          </li>`;
        })
        .join('')
    : '<li class="empty"><p>No budgets yet.</p></li>';
  document.querySelectorAll<HTMLElement>('#budgets .b-fill').forEach((el) => {
    el.style.width = `${el.dataset.pct}%`;
  });
}
