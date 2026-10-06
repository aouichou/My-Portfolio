/**
 * loading — route transition surface (F3-07).
 *
 * Brief §4: motion only to explain space. A route change explains nothing,
 * so this surface is STILL: an amber hairline at full opacity — no spinner,
 * no bounce, no shimmer, no indeterminate loop (the system's only loop is
 * the terminal caret, §2.4). Under --motion-scale: 0 this is pixel-
 * identical, which is the point.
 */

import PageShell from '@/components/PageShell';

export default function Loading() {
  return (
    <PageShell>
      {/* Quiet progress rule — static amber hairline, no animation */}
      <div className="h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-6 text-body-lg text-muted">Loading</p>
    </PageShell>
  );
}
