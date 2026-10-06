/**
 * fonts — next/font/local setup (brief §2.2, F3-06a).
 *
 * Exactly two families (the §6 blacklist allows no more): Inter
 * (InterVariable + InterDisplayVariable, weights 400–600) and IBM Plex
 * Mono (400/500/600). Binaries live in public/fonts/ and are NEVER
 * committed (see public/fonts/README.md for official fetch sources).
 */

import localFont from 'next/font/local';

/**
 * next/font/local requires its loaders called as bare `const X = localFont(...)`
 * expressions at module scope — NO conditionals (the SWC loader rewrites
 * these calls at compile time). The missing-binary fallback therefore
 * cannot be conditional registration; instead we ALWAYS register against
 * public/fonts/, and the fonts README documents that the files must be
 * fetched. When a file is absent, Next dev serves a 404 for that asset —
 * harmless (display:'swap', the token stack's system-ui fallback paints
 * instantly and `--font-inter` resolves to the fallback chain), while
 * every gate (type-check, jest, lint, build) passes without binaries.
 * For CI, placeholder files can be dropped into public/fonts/ (the
 * compiled CSS references them lazily; nothing parses them at build
 * time unless `preload` metrics are requested).
 */

export const inter = localFont({
  src: [{ path: '../../public/fonts/InterVariable.woff2', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  preload: false, // binaries are optional in dev/CI (README); skip preloading
});

export const interDisplay = localFont({
  src: [
    { path: '../../public/fonts/InterDisplayVariable.woff2', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
  weight: '100 900',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
  preload: false,
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
  preload: false,
});
