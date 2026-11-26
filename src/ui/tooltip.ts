// The chart tooltip: follows the mouse over anything with a data-tip (a JSON array: title, then lines); a tap shows
// it on touch screens. The same numbers are in the legend, the budgets and the trend table for keyboard and
// screen reader users.
import { $, esc } from './html';

const targetOf = (e: PointerEvent) => (e.target as Element).closest?.('[data-tip]');

export function initTooltip(): void {
  const tip = $('chart-tip');
  const show = (target: Element, x: number, y: number) => {
    let parts: string[];
    try {
      parts = JSON.parse(target.getAttribute('data-tip') ?? '[]') as string[];
    } catch {
      return;
    }
    tip.innerHTML = `<strong>${esc(parts[0] ?? '')}</strong>${parts
      .slice(1)
      .map((p) => `<span>${esc(p)}</span>`)
      .join('')}`;
    tip.classList.add('show');
    const left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, x + 14));
    const top = y - tip.offsetHeight - 12 < 8 ? y + 16 : y - tip.offsetHeight - 12;
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  document.addEventListener('pointermove', (e) => {
    const target = targetOf(e);
    if (target && e.pointerType !== 'touch') show(target, e.clientX, e.clientY);
    else tip.classList.remove('show');
  });
  document.addEventListener('pointerdown', (e) => {
    const target = targetOf(e);
    if (target && e.pointerType === 'touch') show(target, e.clientX, e.clientY);
    else tip.classList.remove('show');
  });
}
