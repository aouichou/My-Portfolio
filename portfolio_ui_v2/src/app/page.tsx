/**
 * / — THE HOMEPAGE: the live terminal as hero (F3-14, brief §3 candidate A).
 *
 * Composition (approved): Candidate B's typographic chassis with Candidate
 * A mounted inside it — name huge in Inter Display, the terminal plate
 * directly under the name as the central element, paper around it, ONE
 * amber rule between name and terminal. Below: the lede (one line, who/
 * what), then featured work as quiet ProjectCards, then one-line doors to
 * Experience/About. One signature per screen — everything outside the
 * hero is deliberately quiet so the terminal owns the boldness budget.
 *
 * DATA (server, typed): featured = is_featured curation (homepage IS the
 * featuring surface now, Q1); hero demo context = minishell detail (the
 * only project with a real demo zip in R2 — SESSION.md terminal note).
 * Each fetch degrades INDEPENDENTLY: API down ≠ blank page — the hero
 * shows its offline plate, the work row hides, the doors stay.
 *
 * FIRST CONTACT (§4.4, homepage ONLY): the one orchestrated moment —
 * nameplate sets → amber rule draws → terminal pane rises 16px → the
 * muted line types itself. ≤1.2s total, once, via the fc-* classes in
 * globals.css; every duration routes through --motion-scale, so
 * prefers-reduced-motion (dial 0) renders everything at final state.
 *
 * VOICE: ⚠ BATMAN-PERSONALIZE — the lede is a grounded draft (brief §5
 * nameplate voice); he edits in place.
 */

import PageShell from '@/components/PageShell';
import TerminalHero from '@/components/TerminalHero';
import ProjectCard from '@/components/projects/ProjectCard';
import { SITE_OWNER } from '@/components/site-nav';
import { getProjectBySlug, getProjects, toApiError } from '@/library/api-client';
import type { ProjectCard as ProjectCardData } from '@/library/types/api-v2';
import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/** SEO — recruiter-facing, zero oversell (brief §5). */
export const metadata: Metadata = {
  title: 'Amine Aouichou — full-stack engineer',
  description:
    'Portfolio of Amine Aouichou, a full-stack engineer building web services and the infrastructure that runs them. Systems programming at 42 Paris, healthcare platforms at Qynapse.',
  openGraph: {
    title: 'Amine Aouichou — full-stack engineer',
    description:
      'Web services and the infrastructure that runs them. 42 Paris, Qynapse, and a live terminal on the landing page.',
    type: 'website',
    /* Phase 5 note: og:image skipped deliberately — no amber-on-paper
       asset exists yet; a missing image degrades gracefully. */
  },
};

/** The homepage's fixed demo context (dispatch binding). */
const HERO_DEMO_SLUG = 'minishell';

/**
 * ⚠ BATMAN-PERSONALIZE (F3-17 pass): the lede — one line, who/what.
 * Grounded in: 42 Paris curriculum, Qynapse internship, the site itself.
 */
const LEDE =
  'Full-stack engineer. I build web services and the infrastructure that runs them.';

export default async function Home() {
  // Independent fetches — the hero must not wait on the work row.
  const heroProject = await getProjectBySlug(HERO_DEMO_SLUG).catch((error) => {
    console.error('[/] hero demo fetch failed:', toApiError(error).detail);
    return null; // → TerminalHero's offline plate
  });

  const featured = await getProjects({ limit: 100 })
    .then((envelope) => envelope.results.filter((project) => project.is_featured))
    .catch((error) => {
      console.error('[/] featured fetch failed:', toApiError(error).detail);
      return [] as ProjectCardData[]; // → the work row hides
    });

  return (
    <PageShell>
      {/* ——— The nameplate + the terminal mounted in it ———————— */}
      <section aria-label="Nameplate" className="fc-name">
        <h1
          className="max-w-[66ch] text-display-lg font-semibold tracking-[-0.025em] leading-[1.05] text-ink"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          {SITE_OWNER}
        </h1>
        <p className="mt-6 max-w-[66ch] text-body-lg text-muted">{LEDE}</p>
        {/* The ONE amber rule — brief §1: type, paper, and one amber line.
            Draws left-to-right as part of first contact (fc-rule). */}
        <div className="fc-rule mt-12 h-px w-24 bg-accent" aria-hidden="true" />
      </section>

      <section aria-label="Terminal" className="fc-pane mt-12">
        <TerminalHero project={heroProject} />
        <p className="fc-type mt-4 font-mono text-mono text-muted" aria-hidden="true">
          type &apos;help&apos; below to look around
        </p>
      </section>

      {/* ——— Featured work ————————————————————————— */}
      {featured.length > 0 && (
        <section aria-label="Featured work" className="mt-24 md:mt-32">
          <div className="flex items-baseline justify-between gap-6">
            <h2
              className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Selected work
            </h2>
            <Link
              href="/projects"
              className="shrink-0 font-mono text-mono-sm font-medium text-accent underline decoration-accent underline-offset-4 transition-colors duration-fast ease-standard hover:text-ink focus-visible:text-ink"
            >
              All projects
            </Link>
          </div>
          <ul className="mt-6 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ——— One-line doors ————————————————————————— */}
      <section aria-label="Elsewhere" className="mt-24 border-t border-line pt-8 md:mt-32">
        <ul className="flex flex-wrap gap-x-12 gap-y-3 list-none">
          <li>
            <Link
              href="/experience"
              className="text-body text-ink underline decoration-line underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-accent"
            >
              Where I&apos;ve worked
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="text-body text-ink underline decoration-line underline-offset-4 transition-colors duration-fast ease-standard hover:decoration-accent"
            >
              Who I am
            </Link>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}


