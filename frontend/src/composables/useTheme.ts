import { ref } from 'vue';

type Theme = 'light' | 'dark';
const KEY = 'potm-theme';
export const theme = ref<Theme>('light');

function apply(t: Theme) {
  theme.value = t;
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export function initTheme(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* Speicher nicht verfügbar */
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  apply(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light');
}

export function useTheme() {
  function toggle() {
    const next: Theme = theme.value === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignorieren */
    }
  }
  return { theme, toggle };
}
