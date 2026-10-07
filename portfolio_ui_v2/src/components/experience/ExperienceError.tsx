/**
 * ExperienceError — the /experience API-down state (F3-10).
 *
 * Same contract as ProjectsError / ProjectDetailError (F3-08/F3-09a):
 * brief §5.6 voice (what happened + what to do), §4.5 calm-instant (no
 * entrance motion), retry via router.refresh. RSC boundary rule: the
 * server page passes ONLY a plain string — axios error objects cannot
 * cross the divide.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ExperienceError({ detail }: { detail: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  return (
    <div>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        Experience failed to load
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        The experience didn&apos;t arrive
      </h1>
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
        The API didn&apos;t respond, so the story can&apos;t be shown. Try again
        in a moment; if it keeps failing, the detail below identifies the
        failure.
      </p>
      <button
        type="button"
        disabled={retrying}
        onClick={() => {
          setRetrying(true);
          router.refresh();
        }}
        className="mt-6 rounded-md border border-line bg-surface px-4 py-2 text-body font-medium text-ink transition-colors duration-fast ease-standard hover:border-ink disabled:opacity-60"
      >
        {retrying ? 'Retrying' : 'Try again'}
      </button>
      <p className="mt-6 font-mono text-mono-sm text-muted">{detail}</p>
    </div>
  );
}
