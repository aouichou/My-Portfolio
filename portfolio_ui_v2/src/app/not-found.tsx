/**
 * not-found — 404 surface (F3-07).
 *
 * Brief §5.6 voice: state what happened + how to fix it. No apology fluff,
 * no emoji, no whimsy. The route name that was requested is unknowable
 * server-side here, so the copy states the fact plainly: this address has
 * no page. "Back to work" is the §5 plain-verb action (the work index is
 * the site's center of gravity; the wordmark covers "home").
 */

import PageShell from '@/components/PageShell';
import { SITE_NAV } from '@/components/site-nav';
import Link from 'next/link';

export default function NotFound() {
  return (
    <PageShell>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        404 — no page at this address
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        This address has no page
      </h1>
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
        The link may be old, or the slug may be mistyped. Check the spelling,
        or go where the work is:
      </p>
      {/* Every route that exists — the fix, in one place */}
      <ul className="mt-6 flex flex-col gap-2">
        {SITE_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-body font-medium text-ink underline-offset-[6px] decoration-accent decoration-2 hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
