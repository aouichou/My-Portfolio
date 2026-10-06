/**
 * terminalTheme(mode) — brief §7.3 xterm-from-tokens (F3-06a).
 *
 * The terminal IS part of the design system: same tokens, higher density.
 * This function reads the CSS custom properties AT RUNTIME from the
 * document root (respecting the active data-mode pair) and derives an
 * xterm ITheme — the terminal can never drift from the site palette
 * because it doesn't own a palette.
 *
 * Fallbacks (jsdom / pre-hydration / stylesheet failure) mirror the §2.1
 * pairs so a test or SSR render still sees a coherent theme.
 */

import type { ITheme } from '@xterm/xterm';

export type TerminalMode = 'light' | 'dark';

/** §2.1 pairs — the single source of truth lives in globals.css; these
 *  values mirror it for environments without a stylesheet (SSR, jsdom). */
const FALLBACK_PAIRS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--canvas': '#ffffff',
    '--surface': '#f6f5f4',
    '--ink': '#1a1a18',
    '--muted': '#6f6e6a',
    '--line': '#e5e4e0',
    '--accent': '#ad5700',
    '--positive': '#17683b',
    '--negative': '#ba2b2b',
  },
  dark: {
    '--canvas': '#0a0a0b',
    '--surface': '#161719',
    '--ink': '#ededea',
    '--muted': '#9c9b96',
    '--line': '#2b2c2f',
    '--accent': '#ffb224',
    '--positive': '#41d189',
    '--negative': '#ff7a70',
  },
};

function readTokens(mode: TerminalMode): Record<string, string> {
  const out: Record<string, string> = { ...FALLBACK_PAIRS[mode] };
  if (typeof document === 'undefined') return out;

  // Read from a probe carrying the REQUESTED mode so the derived theme
  // matches the pair we were asked for, not whatever the page currently is.
  const probe = document.createElement('div');
  probe.setAttribute('data-mode', mode);
  probe.style.display = 'none';
  document.documentElement.appendChild(probe);
  try {
    const cs = getComputedStyle(probe);
    for (const name of Object.keys(out)) {
      const value = cs.getPropertyValue(name).trim();
      if (value) out[name] = value;
    }
  } finally {
    probe.remove();
  }
  return out;
}

/** accent @ 25% — §7.3 selectionBackground in both modes. */
function alpha(hex: string, opacity: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (full.length !== 6) return hex; // defensive: non-hex input passes through
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function terminalTheme(mode: TerminalMode): ITheme {
  const t = readTokens(mode);

  // §7.3 table — light terminal = canvas body ("paper terminal"); dark =
  // surface body. Gray ramp for ANSI 0–7 / 8–15 (no hue); red/green map
  // to the status tokens.
  return {
    background: mode === 'light' ? (t['--canvas'] ?? '') : (t['--surface'] ?? ''),
    foreground: t['--ink'] ?? '',
    cursor: t['--accent'] ?? '',
    cursorAccent: mode === 'light' ? (t['--canvas'] ?? '') : (t['--surface'] ?? ''),
    selectionBackground: alpha(t['--accent'] ?? '', 0.25),

    black: t['--line'],
    red: t['--negative'],
    green: t['--positive'],
    yellow: t['--accent'],
    blue: t['--muted'],
    magenta: t['--muted'],
    cyan: t['--muted'],
    white: t['--ink'],

    brightBlack: t['--muted'],
    brightRed: t['--negative'],
    brightGreen: t['--positive'],
    brightYellow: t['--accent'],
    brightBlue: t['--muted'],
    brightMagenta: t['--muted'],
    brightCyan: t['--muted'],
    brightWhite: t['--ink'],
  };
}
