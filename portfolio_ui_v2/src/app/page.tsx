/**
 * Home — F3-07 state: the nameplate chassis (Candidate B frame).
 *
 * The signature (live terminal as hero, Candidate A) mounts here in its
 * own slice; this frame keeps the nameplate voice from the brief §5 bonus:
 * name, one-line truth, and the typed hint that will sit above the pane.
 * Shell-level motion: NONE at this stage (the "first contact" moment §4.4
 * ships with the terminal slice, not before) — every element renders at
 * full opacity, so prefers-reduced-motion is trivially honored.
 */

import PageShell from '@/components/PageShell';

export default function Home() {
  return (
    <PageShell>
      <section className="pt-24 md:pt-32">
        <h1
          className="max-w-[66ch] text-display-lg font-semibold tracking-[-0.025em] leading-[1.05] text-ink"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          Amine Aouichou
        </h1>
        <p className="mt-6 max-w-[66ch] text-body-lg text-muted">
          Full-stack engineer. I build web services and the infrastructure
          that runs them.
        </p>
        {/* The one amber accent rule — brief §1: type, paper, and one amber line */}
        <div className="mt-12 h-px w-24 bg-accent" aria-hidden="true" />
        <p className="mt-12 max-w-[66ch] font-mono text-mono text-muted">
          type &apos;help&apos; below to look around
        </p>
      </section>
    </PageShell>
  );
}

