/**
 * fonts — next/font/local setup (brief §2.2, F3-06a; reworked F3-06b).
 *
 * Exactly two families (the §6 blacklist allows no more): Inter
 * (InterVariable + Inter Display statics) and IBM Plex Mono (400/500/600).
 * Binaries live in public/fonts/, are NEVER committed, and are fetched
 * deterministically (SHA-256-pinned) by scripts/fetch-fonts.sh.
 *
 * F3-06b changes:
 *  - REAL binaries have landed → `preload: true` on all three loaders
 *    (the placeholder-era `preload: false` is gone).
 *  - Inter Display is STATIC-ONLY in Inter 4.1 (no InterDisplayVariable
 *    exists in the official release) → registered as a 3-file weight set
 *    covering the brief's 400/500/600.
 *
 * next/font/local requires its loaders called as bare `const X = localFont(...)`
 * expressions at module scope — NO conditionals (the SWC loader rewrites
 * these calls at compile time). Binaries must therefore exist at build
 * time: run `scripts/fetch-fonts.sh` (network) or
 * `scripts/make-font-placeholders.py` (offline dev fallback) first.
 */

import localFont from 'next/font/local';

export const inter = localFont({
  src: [{ path: '../../public/fonts/InterVariable.woff2', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  preload: true,
});

export const interDisplay = localFont({
  src: [
    { path: '../../public/fonts/InterDisplay-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/InterDisplay-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/InterDisplay-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  preload: true,
});

export const plexMono = localFont({
  src: [
    { path: '../../public/fonts/IBMPlexMono-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/IBMPlexMono-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/IBMPlexMono-Bold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
  fallback: ['ui-monospace', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
  preload: true,
});
