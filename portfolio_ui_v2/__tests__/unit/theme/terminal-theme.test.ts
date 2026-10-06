/**
 * terminalTheme(mode) — unit tests (F3-06a, brief §7.3).
 *
 * Pins that the xterm theme is DERIVED from the same CSS custom
 * properties the site consumes (cross-medium rule: the terminal doesn't
 * own a palette). Two layers asserted:
 *  1. jsdom WITH the real globals.css loaded via a <style> element —
 *     the probe reads the actual [data-mode] pairs from the stylesheet.
 *  2. Fallback pairs (no stylesheet resolution) — the §2.1 constants.
 */

import { terminalTheme } from '@/theme/terminal-theme';
import fs from 'fs';
import path from 'path';

const globalsCss = fs.readFileSync(
  path.join(process.cwd(), 'src', 'app', 'globals.css'),
  'utf8'
);

function injectGlobals(): void {
  const style = document.createElement('style');
  style.textContent = globalsCss;
  document.head.appendChild(style);
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('terminalTheme — reads the real stylesheet pairs (§7.3)', () => {
  beforeEach(injectGlobals);

  it('light: paper terminal — canvas body, ink text, amber cursor', () => {
    const theme = terminalTheme('light');
    expect(theme.background?.toLowerCase()).toBe('#ffffff'); // canvas
    expect(theme.foreground?.toLowerCase()).toBe('#1a1a18'); // ink
    expect(theme.cursor?.toLowerCase()).toBe('#ad5700'); // accent (light amber)
    expect(theme.cursorAccent?.toLowerCase()).toBe('#ffffff'); // canvas
  });

  it('dark: surface body, ink text, amber cursor', () => {
    const theme = terminalTheme('dark');
    expect(theme.background?.toLowerCase()).toBe('#161719'); // surface
    expect(theme.foreground?.toLowerCase()).toBe('#ededea'); // ink
    expect(theme.cursor?.toLowerCase()).toBe('#ffb224'); // accent (dark amber)
    expect(theme.cursorAccent?.toLowerCase()).toBe('#161719'); // surface
  });

  it('selection is accent @ 25% in both modes', () => {
    expect(terminalTheme('light').selectionBackground).toBe('rgba(173, 87, 0, 0.25)');
    expect(terminalTheme('dark').selectionBackground).toBe('rgba(255, 178, 36, 0.25)');
  });

  it('ANSI red/green map to the status tokens (negative/positive)', () => {
    const light = terminalTheme('light');
    expect(light.red?.toLowerCase()).toBe('#ba2b2b');
    expect(light.green?.toLowerCase()).toBe('#17683b');
    const dark = terminalTheme('dark');
    expect(dark.red?.toLowerCase()).toBe('#ff7a70');
    expect(dark.green?.toLowerCase()).toBe('#41d189');
  });

  it('the gray ramp carries no hue — ANSI 0–7 non-status slots are the neutral ramp', () => {
    const theme = terminalTheme('dark');
    // black=line, blue/magenta/cyan=muted, white=ink — all neutral
    expect(theme.black?.toLowerCase()).toBe('#2b2c2f');
    expect(theme.blue?.toLowerCase()).toBe('#9c9b96');
    expect(theme.white?.toLowerCase()).toBe('#ededea');
  });
});

describe('terminalTheme — fallback pairs (no stylesheet)', () => {
  it('falls back to the §2.1 constants when no stylesheet resolves', () => {
    // document exists (jsdom) but head is empty — no pairs resolve.
    const theme = terminalTheme('dark');
    expect(theme.background?.toLowerCase()).toBe('#161719');
    expect(theme.cursor?.toLowerCase()).toBe('#ffb224');
  });
});
