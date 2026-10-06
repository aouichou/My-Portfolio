#!/usr/bin/env node
/**
 * check-tokens — the v1 broken-tokens disease guard (brief §7.1.4, F3-06a).
 *
 * PostCSS-compiles src/app/globals.css with the REAL @tailwindcss/postcss
 * plugin, then FAILS if any expected custom property is absent from the
 * output. The v1 failure mode (tailwind.config.ts silently never loaded →
 * bg-primary-style utilities generated no CSS) becomes a red gate here.
 *
 * Usage: node scripts/check-tokens.mjs   (wired as `npm run test:tokens`)
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd } from 'node:process';
import postcss from 'postcss';

/**
 * Every token the @theme inline block must emit into compiled CSS.
 * Names map to brief §2 (visual-identity-brief) — see globals.css.
 */
const EXPECTED_TOKENS = [
  // §2.1 color — near-monochrome + amber accent + status
  '--color-canvas',
  '--color-surface',
  '--color-ink',
  '--color-muted',
  '--color-line',
  '--color-accent',
  '--color-positive',
  '--color-negative',
  // §2.2 fonts
  '--font-sans',
  '--font-mono',
  // §2.3 radius
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  // §2.4 motion — durations route through the --motion-scale dial.
  // Namespace note: TW4 emits `duration-*` utilities only from
  // --transition-duration-* keys (F3-07 fix; --duration-* was a dead var).
  '--ease-out',
  '--ease-standard',
  '--ease-in-out',
  '--transition-duration-instant',
  '--transition-duration-fast',
  '--transition-duration-base',
  '--transition-duration-slow',
  '--transition-duration-ambient',
];

const cssPath = join(cwd(), 'src', 'app', 'globals.css');
const source = await readFile(cssPath, 'utf8');

const result = await postcss([
  (
    await import('@tailwindcss/postcss')
  ).default({
    // Compile standalone: no Next.js layout context in this gate.
    base: '.',
  }),
]).process(source, { from: cssPath, to: undefined });

const css = result.css;

// The compiled output must contain each token as a declared property
// (e.g. `--color-canvas: var(--canvas);` inside the emitted theme layer).
const missing = EXPECTED_TOKENS.filter(
  (name) => !new RegExp(`${name}\\s*:`).test(css)
);

// Blacklist greps (brief §6) on the compiled artifact — zero AI-markers,
// caught before any page ships.
const BLACKLIST = [
  { pattern: /backdrop-filter\s*:\s*blur|backdrop-blur/i, label: 'glassmorphism (backdrop-blur)' },
  { pattern: /linear-gradient|radial-gradient|conic-gradient/i, label: 'decorative gradient' },
  { pattern: /animation\s*:\s*.*infinite/g, label: 'infinite loop animation' },
];

const violations = BLACKLIST.filter((b) => b.pattern.test(css));

let exitCode = 0;

if (missing.length > 0) {
  console.error('✖ token guard FAILED — missing from compiled CSS:');
  for (const name of missing) {
    console.error(`    ${name}`);
  }
  exitCode = 1;
}

if (violations.length > 0) {
  console.error('✖ blacklist FAILED — AI-markers present in compiled CSS:');
  for (const v of violations) {
    console.error(`    ${v.label}`);
  }
  exitCode = 1;
}

if (exitCode === 0) {
  console.log(
    `✔ token guard PASSED — ${EXPECTED_TOKENS.length}/${EXPECTED_TOKENS.length} tokens present in compiled globals.css; blacklist clean.`
  );
}

process.exit(exitCode);
