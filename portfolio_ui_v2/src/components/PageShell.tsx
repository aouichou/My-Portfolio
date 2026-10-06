/**
 * PageShell — the shared page frame inside the site chrome (F3-07).
 *
 * §2.3 rhythm: 96px (pt-24) before the first section under a "hero",
 * 128px (pb-32) before the footer fold. Container: max-w 1120
 * (--container) with 24/40 gutters. min-height pushes the footer down
 * on thin pages without fake filler content. flex-1 keeps it stretchy
 * inside the body's flex column.
 */

import type { ReactNode } from 'react';

export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <main
      id="main"
      className="mx-auto min-h-[60vh] w-full max-w-[var(--container)] flex-1 px-6 pt-24 pb-32 md:px-10"
    >
      {children}
    </main>
  );
}
