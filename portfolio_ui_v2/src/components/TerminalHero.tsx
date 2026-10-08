/**
 * TerminalHero — the live terminal mounted in the nameplate (F3-14).
 *
 * THE signature (brief §3 candidate A, approved): a real shell the visitor
 * can type into seconds after landing, embedded in the typographic
 * nameplate. This wrapper owns everything around the live pane so
 * LiveTerminal itself stays the frozen-protocol port it is:
 *
 * - SESSION FRUGALITY (dispatch): the WS session starts on the visitor's
 *   FIRST INTERACTION with the terminal area — not on page load. Every
 *   scroll-by must not burn a guest JWT + bash slot. LiveTerminal mints
 *   its token on ITS mount (F3-01 port semantics), so frugality is
 *   achieved by GATING the mount: the dormant plate is a plain button;
 *   LiveTerminal (via React.lazy) mounts only after activation.
 * - ENABLEMENT GATE: LiveTerminal's own semantics assume the caller
 *   verified has_demo. Here the hero's fixed demo context is `minishell`
 *   (the only project with a real demo zip in R2 — SESSION.md terminal
 *   note). has_demo=false (prod today) renders the designed degradation:
 *   a quiet "Demo offline" line + the door to the project page. No fake
 *   terminal, ever.
 * - A11Y: the region is labeled; activation is a real button (keyboard
 *   focusable, visible accent ring via the global :focus-visible rule).
 *
 * Motion: NONE here — the §4.4 first-contact moment lives in the page's
 * CSS (fc-* classes); this component renders at full opacity (§4.5).
 */

'use client';

import type { ProjectDetail } from '@/library/types/api-v2';
import Link from 'next/link';
import { lazy, Suspense, useState } from 'react';

/** The homepage's fixed demo context — see header comment. */
const HERO_DEMO_SLUG = 'minishell';

/** xterm + WS client, code-split: the hero pane is the only entry point. */
const LiveTerminal = lazy(() => import('@/components/LiveTerminal'));

export interface TerminalHeroProps {
  /** minishell's detail (typed fetch in the server page). */
  project: Pick<ProjectDetail, 'slug' | 'has_demo'> | null;
}

/**
 * The reserved plate while the lazy chunk loads — same geometry as the
 * live pane (no layout shift), quiet mono line, no spinner.
 */
function PaneLoading() {
  return (
    <div className="flex h-[420px] items-center justify-center" role="status">
      <p className="font-mono text-mono-sm text-muted">Opening terminal…</p>
    </div>
  );
}

export default function TerminalHero({ project }: TerminalHeroProps) {
  const [live, setLive] = useState(false);

  // Fetch failed entirely (API down): same quiet degradation as the
  // disabled demo — the page's other sections carry their own states.
  const demoEnabled = project?.has_demo === true;

  return (
    <section
      aria-label="Live terminal — minishell demo"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-card"
    >
      {/* Chrome: one quiet titlebar. The amber dot is the status cue —
          solid when the demo is enabled, muted when offline. No close/
          minimize traffic lights: this is a plate, not a fake OS window. */}
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="font-mono text-mono-sm text-muted">
          minishell — <span className="text-ink">live demo</span>
        </p>
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${demoEnabled ? 'bg-accent' : 'bg-line'}`}
        />
      </div>

      {!demoEnabled ? (
        /* Designed degradation (dispatch): prod has has_demo=false on all
           12 projects today. Quiet, honest, links to the real thing. */
        <div className="flex h-[420px] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-mono text-mono-sm text-muted">Demo offline</p>
          <p className="max-w-[52ch] text-body text-muted">
            The live shell is being prepared for this project.
          </p>
          <Link
            href={`/projects/${HERO_DEMO_SLUG}`}
            className="rounded-sm font-mono text-mono-sm font-medium text-accent underline decoration-accent underline-offset-4 transition-colors duration-fast ease-standard hover:text-ink focus-visible:text-ink"
          >
            View the project instead
          </Link>
        </div>
      ) : live ? (
        /* Activated: the lazy LiveTerminal mounts and owns its lifecycle
           (token mint on mount → WS → xterm). Height matches the dormant
           plate so activation causes no reflow. */
        <div className="h-[420px] px-4 py-3">
          <Suspense fallback={<PaneLoading />}>
            <LiveTerminal project={project} slug={project?.slug ?? HERO_DEMO_SLUG} />
          </Suspense>
        </div>
      ) : (
        /* Dormant plate: the first-interaction gate. One button, says
           exactly what happens (brief §5.5). Keyboard: real button =
           focusable + Enter/Space; the global :focus-visible ring shows. */
        <button
          type="button"
          onClick={() => setLive(true)}
          aria-label={`Start the ${HERO_DEMO_SLUG} live terminal session`}
          className="group flex h-[420px] w-full flex-col items-center justify-center gap-4 px-6 text-center focus-visible:outline-none"
        >
          <span className="font-mono text-mono text-muted group-hover:text-ink transition-colors duration-fast ease-standard">
            <span className="text-accent">$</span> ready — press to connect
          </span>
          <span className="max-w-[52ch] text-body text-muted">
            Opens a real shell with the minishell source. Nothing else runs
            until you do.
          </span>
        </button>
      )}
    </section>
  );
}
