/**
 * ArchitectureDiagrams — mermaid diagrams as numbered figures (F3-09b).
 *
 * Editorial device: a diagram prints like a plate — `Fig. N — {title}`
 * mono caption, description prose above, the rendered diagram inside a
 * bordered paper plate. Numbering is figure-specific (Fig. 1, Fig. 2 …),
 * distinct from image Plates, matching the specimen-sheet voice.
 *
 * Rendering contract (dispatch):
 * - CLIENT-side + LAZY: mermaid is heavy (~1MB); it loads only when a
 *   diagram scrolls near the viewport (IntersectionObserver), then via
 *   dynamic `import('mermaid')` so it stays OUT of the initial chunk.
 * - SSR-SAFE: until mounted, the slot renders a quiet reserved box
 *   (min-h + border) — no layout shift, no fake content.
 * - TOKEN-SKINNED: theme "base" + themeVariables fully pinned to our
 *   runtime tokens (diagram-theme.ts) — mermaid's blue/purple defaults
 *   are unreachable (blacklist §6).
 * - `custom`/image sources render as plates via plain <img> (URL) or a
 *   sanitized inline plate — svg-sanitizer is v1-side and SVG-specific;
 *   here a custom SVG string is NOT injected as markup (no
 *   dangerouslySetInnerHTML) — unknown markup never enters the DOM.
 */

'use client';

import type { ArchitectureDiagram } from '@/library/types/api-v2';
import { useEffect, useRef, useState } from 'react';
import { readDiagramPalette, toMermaidThemeVariables } from './diagram-theme';

/** Quiet reserved box pre-mount — no layout shift, no fake diagram. */
const PLACEHOLDER_CLASS =
  'min-h-[220px] w-full rounded-md border border-line bg-surface';

interface MermaidFigureProps {
  source: string;
  label: string;
}

/**
 * One lazy, client-rendered mermaid figure. Render errors degrade to a
 * quiet inline note INSIDE the plate (brief §5.6: what happened + what
 * to do) — never a broken plate, never an exception thrown up the tree.
 */
function MermaidFigure({ source, label }: MermaidFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Lazy: only start work when the figure nears the viewport.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true); // no IO (test env) → render eagerly.
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Render once visible: dynamic import keeps mermaid out of the route's
  // initial JS; theme is pinned to live tokens read at render time.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: toMermaidThemeVariables(readDiagramPalette()),
          securityLevel: 'strict',
          fontFamily:
            'var(--font-plex-mono), ui-monospace, Menlo, Consolas, monospace',
        });
        const { svg } = await mermaid.render(`fig-${label.replace(/\W+/g, '-')}`, source);
        if (!cancelled) setSvg(svg);
      } catch {
        // Malformed source is a DATA state: say so, keep the frame.
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, source, label]);

  return (
    <div
      ref={containerRef}
      className={`${PLACEHOLDER_CLASS} overflow-x-auto p-4 md:p-6`}
      role="img"
      aria-label={`${label} diagram`}
    >
      {svg ? (
        // mermaid securityLevel 'strict' sanitizes its own output; the
        // svg string is mermaid-generated, not arbitrary payload HTML.
        <div
          className="mermaid-figure prose-svg-canvas"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : failed ? (
        <p className="p-4 font-mono text-mono-sm text-muted">
          This diagram didn&apos;t parse — its source text has a syntax error.
        </p>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center">
          <span className="font-mono text-mono-sm text-muted">{label} diagram</span>
        </div>
      )}
    </div>
  );
}

export interface ArchitectureDiagramsProps {
  diagrams: ArchitectureDiagram[];
}

export default function ArchitectureDiagrams({ diagrams }: ArchitectureDiagramsProps) {
  if (diagrams.length === 0) return null;

  return (
    <div className="space-y-24">
      {diagrams.map((diagram, index) => {
        const number = index + 1;
        const caption = diagram.title || `Diagram ${number}`;
        const isImageUrl =
          diagram.type === 'custom' && /^https?:\/\//i.test(diagram.content.trim());
        return (
          <figure key={`${caption}-${number}`} aria-label={`Fig. ${number} — ${caption}`}>
            {diagram.description ? (
              <p className="mb-3 max-w-[66ch] text-body text-muted">{diagram.description}</p>
            ) : null}
            {isImageUrl ? (
              <div className={PLACEHOLDER_CLASS}>
                {/* eslint-disable-next-line @next/next/no-img-element -- custom diagram URLs are absolute API-media links outside the Next optimizer allowlist; F3-08/F3-09a precedent. */}
                <img
                  src={diagram.content.trim()}
                  alt={`${caption} diagram`}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full rounded-md"
                />
              </div>
            ) : diagram.type === 'mermaid' ? (
              <MermaidFigure source={diagram.content} label={caption} />
            ) : (
              // 'custom'/'flowchart' non-URL sources: rendered as source
              // text in a plate (never injected as markup).
              <pre className={`${PLACEHOLDER_CLASS} overflow-x-auto p-4 font-mono text-mono-sm text-ink`}>
                <code>{diagram.content}</code>
              </pre>
            )}
            <figcaption className="mt-3 font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
              Fig. {number} — {caption}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
