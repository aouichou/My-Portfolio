/**
 * error — route error boundary (F3-07).
 *
 * Brief §5.6 voice: what happened + what to do, and §4.5: error feedback
 * is CALM and INSTANT — full opacity immediately, zero entrance motion
 * (motion lives only where it explains space; an error is not space).
 * "Try again" retries the segment (Next 16 `retry` prop — the renamed
 * `reset`). A mono digest line gives the reportable fact.
 */

'use client';

import PageShell from '@/components/PageShell';
import { useEffect } from 'react';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surface for diagnostics (console/reporting service hook point).
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        This page failed to load
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        Something broke while rendering this page
      </h1>
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
        Retrying re-runs the page; if it keeps failing, the digest below
        identifies the failure in the logs.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 rounded-md border border-line bg-surface px-4 py-2 text-body font-medium text-ink transition-colors duration-fast ease-standard hover:border-ink"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="mt-6 font-mono text-mono-sm text-muted">
          digest {error.digest}
        </p>
      ) : null}
    </PageShell>
  );
}
