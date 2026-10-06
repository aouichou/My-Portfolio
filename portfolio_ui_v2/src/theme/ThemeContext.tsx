/**
 * ThemeContext — v2 port (F3-01), designed to drive the approved brief's
 * light/dark token pairs (visual-identity-brief §7.2).
 *
 * Ported from portfolio_ui/src/context/ThemeContext.tsx @ rework/v2 6bb5a78
 * with ONE deliberate adaptation (the port's stated purpose, not a bug fix):
 * alongside the v1 `.dark` class, the provider also sets the `data-mode`
 * attribute — the hook the TW4 token layer (§7.1 `:root`/`.dark` CSS pairs
 * + `@theme inline`) and the pre-paint script will key off in F3-06.
 * localStorage key stays `theme` (brief §7.2: "keep the key"); the legacy
 * `darkMode` migration is preserved verbatim.
 *
 * `system` support (brief §7.2: `light | dark | system`) arrives with the
 * scaffold — adding it now, without the pre-paint script, would flash.
 */

'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => null, // no-op default outside a provider (v1 behavior)
});

function applyThemeToDocument(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Brief §7.2 hook: data-mode drives color-scheme + the token pairs.
  root.setAttribute('data-mode', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  // Load theme from localStorage on mount (v1 logic, kept verbatim)
  useEffect(() => {
    // Migrate old preference format if needed
    const oldPreference = localStorage.getItem('darkMode');
    if (oldPreference !== null) {
      const newTheme: Theme = oldPreference === 'true' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      localStorage.removeItem('darkMode');
      setTheme(newTheme);
      return;
    }

    const savedTheme =
      localStorage.getItem('theme' as 'theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    setTheme(savedTheme === 'dark' ? 'dark' : 'light');
  }, []);

  // Update when theme changes (v1 logic + data-mode)
  useEffect(() => {
    localStorage.setItem('theme', theme);
    applyThemeToDocument(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
