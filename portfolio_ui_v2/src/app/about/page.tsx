/**
 * /about — the person behind the work (F3-11).
 *
 * Audience: recruiters and freelance clients. One quiet scroll, the same
 * editorial rhythm as every body page: overline → display name → amber
 * rule → lede → mono facts block → what-I-do list → the door out.
 *
 * VOICE (binding): professional, zero oversell — facts only, first
 * person, plain verbs. Every line below is derived from verifiable
 * sources: the 42 Paris curriculum (C/C++ systems projects, ft_transcendence
 * full-stack capstone), the Qynapse internship (Fullstack Engineer intern,
 * served by the API), and the projects' own tech stacks. NO photo, NO
 * skill bars, NO years-of-experience counters (dispatch rules).
 *
 * ⚠ F3-17 (Batman content pass): every block below carries a
 * BATMAN-PERSONALIZE marker in a comment — the copy is a grounded draft
 * he should edit in place. Do not tighten the voice without him.
 */

import PageShell from '@/components/PageShell';
import { SITE_OWNER } from '@/components/site-nav';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About — My-Portfolio',
  description:
    'Amine Aouichou — fullstack engineer. Systems programming at 42 Paris, healthcare platforms at Qynapse, AI integrations in personal work.',
};

/**
 * ⚠ BATMAN-PERSONALIZE (F3-17): the lede — who you are + what you build.
 * Grounded in: 42 Paris curriculum, Qynapse role, the projects' stacks.
 */
const LEDE =
  'I build software end to end: the interface, the API behind it, and the infrastructure that runs it. I learned engineering at 42 Paris — C, memory, concurrency — and spent six months as a Fullstack Engineer intern at Qynapse, building HIPAA-compliant healthcare analytics in a Zero Trust stack.';

/**
 * ⚠ BATMAN-PERSONALIZE (F3-17): the mono facts block — verifiable claims
 * only. Sources: CV (education), API experiences (internship), site nav
 * (name). Keep every row falsifiable; remove rows before rounding them.
 */
const FACTS: Array<{ label: string; value: string }> = [
  { label: 'Name', value: SITE_OWNER },
  { label: 'Based in', value: 'France' },
  { label: 'Studying', value: '42 Paris — Expert in IT Architecture (RNCP Level 7)' },
  { label: 'Internship', value: 'Qynapse — Fullstack Engineer intern (May–Nov 2025)' },
];

/**
 * ⚠ BATMAN-PERSONALIZE (F3-17): what I do — plain verbs, derived from the
 * actual project stacks (minishell/minirt/philosophers → C systems;
 * ft_transcendence + Qynapse → fullstack web; mistral-realms → AI).
 */
const WHAT_I_DO: string[] = [
  'Systems programming in C and C++ — shells, renderers, concurrency, IPC',
  'Fullstack web — Python (Django, FastAPI), TypeScript (Next.js, React), PostgreSQL',
  'AI integrations — LLM agents, RAG, embeddings, provider fallbacks',
  'Infrastructure — Docker, Kubernetes, CI pipelines, observability',
];

export default function AboutPage() {
  return (
    <PageShell>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        About
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        {SITE_OWNER}
      </h1>
      {/* The one amber rule — brief §1 */}
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">{LEDE}</p>

      <div className="mt-24 max-w-[66ch] space-y-24">
        {/* --- Facts: the mono ledger voice (§5.3) ----------------------- */}
        <section aria-label="Facts">
          <h2
            className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
            style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
          >
            Facts
          </h2>
          <dl className="mt-4">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0"
              >
                <dt className="min-w-40 font-mono text-mono-sm text-muted">{fact.label}</dt>
                <dd className="text-body text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* --- What I do: plain verbs from real stacks ------------------- */}
        <section aria-label="What I do">
          <h2
            className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
            style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
          >
            What I do
          </h2>
          <ul className="mt-4 list-none space-y-2">
            {WHAT_I_DO.map((item) => (
              <li key={item} className="flex gap-3 text-body text-ink">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-line" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* --- The door out: same verb as the footer (§5.5) -------------- */}
        <section aria-label="Contact">
          <h2
            className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
            style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
          >
            Contact
          </h2>
          {/* ⚠ BATMAN-PERSONALIZE (F3-17): the closing line's tone. */}
          <p className="mt-4 max-w-[66ch] text-body text-muted">
            Recruiting, or have a project in mind? The contact page reaches me
            directly — I read everything.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block text-body font-medium text-ink underline underline-offset-[6px] decoration-accent decoration-2 hover:decoration-ink"
          >
            Email me
          </Link>
        </section>
      </div>
    </PageShell>
  );
}

