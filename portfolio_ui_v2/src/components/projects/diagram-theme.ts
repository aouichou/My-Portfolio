/**
 * diagram-theme — the mermaid skin (F3-09b).
 *
 * CRITICAL binding (dispatch): mermaid's DEFAULT theme is blue/purple —
 * the exact blacklist hues the brief forbids. This module maps OUR
 * runtime tokens (paper/canvas bg, ink strokes, muted labels, amber
 * accents) onto mermaid's `themeVariables` so a rendered diagram is
 * indistinguishable, tonally, from the page that hosts it.
 *
 * Values are read from getComputedStyle at render time (NOT copied from
 * globals.css) so light/dark and future token tweaks flow through with
 * zero duplication — the same runtime-variable doctrine as the TW4
 * `@theme inline` layer.
 *
 * Theme: `base` (the neutral skeleton mermaid then re-skins). Every
 * color-bearing variable is explicitly pinned; mermaid's fallbacks are
 * never reachable. No fills except canvas/paper + a single amber wash
 * for `actor`-style highlighted nodes.
 */

export interface DiagramPalette {
  /** diagram plate background — the page's canvas (paper). */
  canvas: string;
  /** raised inner surface (subgraph fills) — the surface token. */
  surface: string;
  /** primary strokes + node borders — ink. */
  ink: string;
  /** secondary text — muted. */
  muted: string;
  /** hairlines for minor structure — line. */
  line: string;
  /** THE accent — terminal amber, for emphasis nodes/edges only. */
  accent: string;
  /** failure tint — error-icon text in the diagram CSS (rarely hit). */
  negative: string;
}

/** Read the live token palette from the document root. */
export function readDiagramPalette(root: HTMLElement | null = null): DiagramPalette {
  const styles = getComputedStyle(root ?? document.documentElement);
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    canvas: read('--canvas', '#ffffff'),
    surface: read('--surface', '#f6f5f4'),
    ink: read('--ink', '#1a1a18'),
    muted: read('--muted', '#6f6e6a'),
    line: read('--line', '#e5e4e0'),
    accent: read('--accent', '#ad5700'),
    negative: read('--negative', '#ba2b2b'),
  };
}

/**
 * mermaid `themeVariables` for theme "base", fully pinned to the palette.
 * Names are mermaid's public theming surface (v12); the mapping is
 * exhaustive on purpose — any variable left unset would fall back to
 * mermaid's blue/purple defaults (blacklist §6: purple/indigo hues).
 */
export function toMermaidThemeVariables(palette: DiagramPalette): Record<string, string> {
  return {
    darkMode: 'false',
    background: palette.canvas,
    // A faint amber wash (8% alpha) — the ONE fill; reads as paper, not paint.
    primaryColor: palette.accent + '14',
    primaryTextColor: palette.ink,
    primaryBorderColor: palette.ink,
    secondaryColor: palette.surface,
    secondaryTextColor: palette.ink,
    secondaryBorderColor: palette.line,
    tertiaryColor: palette.surface,
    tertiaryTextColor: palette.muted,
    tertiaryBorderColor: palette.line,
    // Flowchart (the shape our diagrams actually use).
    mainBkg: palette.accent + '14',
    nodeBorder: palette.ink,
    nodeTextColor: palette.ink,
    clusterBkg: palette.canvas,
    clusterBorder: palette.line,
    edgeLabelBackground: palette.canvas,
    // Residual default-skin classes (verified against mermaid 12.1.0
    // output): these only style features our diagrams don't use
    // (edge-label backgrounds, error icons, KaTeX math, icons) — pinned
    // anyway so NOT A SINGLE default hue exists in the emitted SVG.
    errorBkgColor: palette.surface,
    errorTextColor: palette.negative,
    katexColor: palette.ink,
    // Lines + arrows: ink strokes, never mermaid's default blue-purple.
    lineColor: palette.ink,
    arrowheadColor: palette.ink,
    defaultLinkColor: palette.ink,
    // Sequence-specific (kept ink/amber in case one ships later).
    actorBkg: palette.accent + '14',
    actorBorder: palette.ink,
    actorTextColor: palette.ink,
    actorLineColor: palette.line,
    signalColor: palette.ink,
    signalTextColor: palette.ink,
    labelBoxBkgColor: palette.surface,
    labelBoxBorderColor: palette.line,
    labelTextColor: palette.ink,
    loopTextColor: palette.muted,
    noteBkgColor: palette.surface,
    noteBorderColor: palette.line,
    noteTextColor: palette.ink,
    activationBkgColor: palette.accent + '14',
    activationBorderColor: palette.ink,
    // Shared text.
    textColor: palette.ink,
    fontSize: '16px',
    fontFamily: 'var(--font-plex-mono), ui-monospace, Menlo, Consolas, monospace',
  };
}
