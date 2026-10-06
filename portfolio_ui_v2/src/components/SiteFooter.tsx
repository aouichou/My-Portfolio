/**
 * SiteFooter — minimal close (F3-07): © line + contact link + repo link.
 *
 * Brief §5.5: links say exactly what happens — "Email me" (the /contact
 * route; same name everywhere) and "View the repository". Copy text, no
 * icon chrome (icons are a later slice's concern, lucide-only per §6).
 * The 1px top hairline is the paper's quiet fold — `line` token, not ink.
 *
 * Year: server HTML renders no year (avoids a stale build pinning it and
 * a hydration mismatch); the client subscription fills it after mount via
 * useSyncExternalStore — no setState-in-effect.
 */

'use client';

import { SITE_OWNER } from '@/components/site-nav';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  // The year never changes within a session — no timer needed; the void
  // return satisfies the unsubscribe contract without a no-op expression.
  void callback;
  return () => undefined;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getServerYear(): number {
  return 0; // sentinel: server snapshot renders without a year
}

export default function SiteFooter() {
  const year = useSyncExternalStore(subscribe, getCurrentYear, getServerYear);

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-[var(--container)] flex-col gap-3 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
        <p className="text-caption text-muted">
          {year === 0 ? `© ${SITE_OWNER}` : `© ${year} ${SITE_OWNER}`}
        </p>
        <div className="flex items-center gap-6">
          <a
            href="/contact"
            className="text-caption font-medium text-ink underline-offset-[6px] decoration-accent decoration-2 hover:underline"
          >
            Email me
          </a>
          <a
            href="https://github.com/aouichou/My-Portfolio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-caption font-medium text-ink underline-offset-[6px] decoration-accent decoration-2 hover:underline"
          >
            View the repository
          </a>
        </div>
      </div>
    </footer>
  );
}
