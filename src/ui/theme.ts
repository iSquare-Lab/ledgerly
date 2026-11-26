// Light and dark themes: follows the system until the visitor picks one with the toggle, which is remembered.
import { store } from '../lib/storage';
import { $ } from './html';
import { icons } from './icons';

type Theme = 'light' | 'dark';
const KEY = 'ledgerly.theme';

export function initTheme(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const stored = store.get(KEY);
  let theme: Theme = stored === 'light' || stored === 'dark' ? stored : media.matches ? 'dark' : 'light';
  const button = $('theme-toggle');
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    const next = theme === 'dark' ? 'light' : 'dark';
    button.innerHTML = theme === 'dark' ? icons.sun() : icons.moon();
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.title = `Switch to ${next} theme`;
  };
  media.addEventListener('change', (e) => {
    if (!store.get(KEY)) {
      theme = e.matches ? 'dark' : 'light';
      apply();
    }
  });
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    store.set(KEY, theme);
    apply();
  });
  apply();
}
