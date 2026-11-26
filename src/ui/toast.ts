// Short messages at the bottom of the page, optionally with one action button (Undo). The message is a polite live
// region; the toast stays while the pointer or focus is on it.
import { $ } from './html';

export interface ToastAction {
  label: string;
  run: () => void;
  /** A keyboard shortcut for the same action, shown on devices with a keyboard, e.g. "Control+Z". */
  shortcut?: string;
}

const SHORT = 3800;
const WITH_ACTION = 8000;

let timer = 0;
let current: ToastAction | undefined;

const el = () => $('toast');
const button = () => $<HTMLButtonElement>('toast-action');

function hide(): void {
  el().classList.remove('show');
  button().hidden = true;
  current = undefined;
}

function schedule(ms: number): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(hide, ms);
}

export function toast(message: string, action?: ToastAction): void {
  current = action;
  $('toast-text').textContent = message;
  const b = button();
  b.hidden = !action;
  b.textContent = action?.label ?? '';
  if (action?.shortcut) b.setAttribute('aria-keyshortcuts', action.shortcut);
  else b.removeAttribute('aria-keyshortcuts');
  const hint = $('toast-hint');
  hint.hidden = !action?.shortcut;
  hint.textContent = action?.shortcut ? shortcutLabel(action.shortcut) : '';
  el().classList.add('show');
  schedule(action ? WITH_ACTION : SHORT);
}

/** "Control+Z" as people read it here: "Ctrl+Z", or "⌘Z" on Apple devices. */
function shortcutLabel(shortcut: string): string {
  const apple = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return apple ? shortcut.replace('Control+', '⌘') : shortcut.replace('Control+', 'Ctrl+');
}

const pause = () => window.clearTimeout(timer);

export function initToast(): void {
  const t = el();
  button().addEventListener('click', () => {
    const action = current;
    hide();
    action?.run();
  });
  // Keep the toast while someone is reading it or about to press its button.
  const resume = () => {
    if (t.classList.contains('show') && !t.matches(':hover, :focus-within')) schedule(2500);
  };
  t.addEventListener('pointerenter', pause);
  t.addEventListener('focusin', pause);
  t.addEventListener('pointerleave', resume);
  t.addEventListener('focusout', () => window.setTimeout(resume));
}
