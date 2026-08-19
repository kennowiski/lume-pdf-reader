import { useEffect, useState } from 'react';
import { usePdfStore } from '../store/usePdfStore';

/**
 * Resolve o tema "system" para 'light' | 'dark' com base na preferência do SO,
 * e reage a mudanças em tempo real. Usado em vez de repetir window.matchMedia
 * em cada componente que precisa saber o tema ativo.
 */
export function useActiveTheme(): 'light' | 'dark' | 'sepia' {
  const theme = usePdfStore((s) => s.theme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (theme === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return theme;
}
