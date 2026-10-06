/**
 * RoutePlaceholder — the F3-07 route scaffold page body.
 *
 * Every scaffolded route renders the same frame: mono overline (route key,
 * muted, IBM Plex Mono — the ledger voice §2.5), the route name in the
 * DISPLAY face (display size, semibold, −2% tracking — §2.2), one amber
 * rule (the §1 material set: type, paper, one amber line), and a muted
 * body line stating what will live here (F3-08+ replaces this component
 * per route — it is scaffolding, not a page).
 */

import type { ReactNode } from 'react';

export interface RoutePlaceholderProps {
  /** Mono overline key, e.g. "ROUTE /PROJECTS" (§2.5 ledger voice). */
  overline: string;
  /** Display-face route name, e.g. "Work". */
  title: string;
  /** One muted body line: what will live here. */
  note: ReactNode;
}

export default function RoutePlaceholder({ overline, title, note }: RoutePlaceholderProps) {
  return (
    <div className="pt-24 md:pt-32">
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        {overline}
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        {title}
      </h1>
      {/* The one amber rule — brief §1 */}
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">{note}</p>
    </div>
  );
}
