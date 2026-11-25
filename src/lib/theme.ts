import { useSyncExternalStore } from 'react';

/**
 * Tema claro/escuro. Sem escolha salva, segue o sistema do iPhone.
 * Ao escolher o mesmo tema do sistema, a escolha é apagada e volta a seguir o sistema.
 * O index.html aplica o tema antes da pintura (sem piscar); a chave precisa ser a mesma.
 */
export type Theme = 'light' | 'dark';

const KEY = 'sb-theme';
const BG: Record<Theme, string> = { light: '#f5f5f7', dark: '#000000' };
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function saved(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

const system = (): Theme => (mq.matches ? 'dark' : 'light');
const current = (): Theme => saved() ?? system();

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[t]);
  listeners.forEach((l) => l());
}

export function setTheme(t: Theme) {
  try {
    if (t === system()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  apply(t);
}

mq.addEventListener('change', () => {
  if (!saved()) apply(system());
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = (): Theme => (document.documentElement.dataset.theme as Theme) || current();

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot);
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}
