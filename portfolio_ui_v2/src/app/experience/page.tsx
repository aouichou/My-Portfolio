/**
 * /experience — the professional story page (F3-10).
 *
 * Editorial rhythm identical to the project detail page: overline → display
 * h1 (the company) → amber rule → lede (subtitle) → mono facts row → body
 * sections that render FROM DATA PRESENT. One <section> per experience:
 * today n=1 (Qynapse), and the page already tells two stories cleanly the
 * day a second experience ships — no layout change, just data.
 *
 * Fetch: the §3.4 list first (identity + order), then the §3.5 detail per
 * slug — the list row lacks `overview`/`technologies`/`impact_metrics`, so
 * the detail is the contract-clean source for the body. Nested projects
 * render as the SAME ProjectCard as the work index (F3-08, consistency
 * rule), featured-first, under a plain-verb heading: "Shipped at {company}".
 *
 * Content facts (Batman rules, SESSION.md): role renders EXACTLY as the API
 * serves it — "Fullstack Engineer intern" (D4). Period + duration + project
 * count are served values; the page renders what it is served.
 */

import ExperienceError from '@/components/experience/ExperienceError';
import PageShell from '@/components/PageShell';
import InternshipFacts from '@/components/projects/InternshipFacts';
import { sortProjectCards } from '@/components/projects/project-sections';
import ProjectCard from '@/components/projects/ProjectCard';
import { getExperienceBySlug, getExperiences, toApiError } from '@/library/api-client';
import type { ExperienceDetail, ExperienceListItem, TechItem } from '@/library/types/api-v2';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Experience — My-Portfolio',
  description:
    'Where the work happened: internships in industry, told by the systems shipped — currently Qynapse, healthcare AI.',
};

/** Section h2 — the shared title-2 voice across all body pages. */
const SECTION_H2_CLASS =
  'text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink';

/** Resolve `**bold**` markers the API prose carries — no markdown lib. */
function renderBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-medium">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/** Overview prose: blank-line paragraphs, bold resolved, editorial measure. */
function OverviewProse({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, i) => (
        // Static ordered list — index keys are stable; marker-bearing
        // slices would leak `**` into the flight payload as keys.
        <p key={`p-${i}`} className="text-body text-ink">
          {renderBold(paragraph)}
        </p>
      ))}
    </div>
  );
}

/**
 * Group technologies by category in first-seen order. Today the API serves
 * every technology uncategorized (category: null) → one quiet flat list.
 * The day categories are authored, each group gains its mono label with
 * zero page changes (structure renders from data present).
 */
function groupTechnologies(technologies: TechItem[]): Array<{
  category: string | null;
  items: TechItem[];
}> {
  const groups: Array<{ category: string | null; items: TechItem[] }> = [];
  for (const tech of technologies) {
    const category = tech.category ?? null;
    const existing = groups.find((group) => group.category === category);
    if (existing) {
      existing.items.push(tech);
    } else {
      groups.push({ category, items: [tech] });
    }
  }
  return groups;
}

/** One experience = one story section: header block + body sections. */
function ExperienceStory({
  experience,
  separated,
}: {
  experience: ExperienceDetail;
  /** Later stories open with a hairline — the index's section language. */
  separated: boolean;
}) {
  const {
    company,
    role,
    subtitle,
    period_display: period,
    duration_months: durationMonths,
    project_count: projectCount,
    overview,
    stats,
    impact_metrics: impactMetrics,
    documentation,
    technologies,
    projects,
  } = experience;

  const hasFacts =
    stats.length > 0 || impactMetrics.length > 0 || documentation.length > 0;
  const techGroups = groupTechnologies(technologies);

  return (
    <section
      aria-label={company}
      className={separated ? 'mt-32 border-t border-line pt-24' : undefined}
    >
      {/* --- Header: overline → company → rule → lede → facts row ------ */}
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        Experience
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        {company}
      </h1>
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">{subtitle}</p>
      <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-line pb-8">
        {/* The role renders exactly as served (Batman D4) — ink, row head. */}
        <span className="font-mono text-mono-sm text-ink">{role}</span>
        <span className="font-mono text-mono-sm text-muted">{period}</span>
        <span className="font-mono text-mono-sm text-muted">{`${durationMonths} months`}</span>
        <span className="font-mono text-mono-sm text-muted">
          {projectCount} {projectCount === 1 ? 'project' : 'projects'}
        </span>
      </div>

      {/* --- Body: same section rhythm as the detail page --------------- */}
      <div className="mt-24 max-w-[66ch] space-y-24">
        {overview ? (
          <section aria-label="Overview">
            <h2
              className={SECTION_H2_CLASS}
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Overview
            </h2>
            <div className="mt-6">
              <OverviewProse text={overview} />
            </div>
          </section>
        ) : null}

        {hasFacts ? (
          <section aria-label="Facts" className="max-w-none">
            <h2
              className={SECTION_H2_CLASS}
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Facts
            </h2>
            <div className="mt-6 max-w-[66ch]">
              <InternshipFacts
                stats={stats}
                impactMetrics={impactMetrics}
                documentation={documentation}
              />
            </div>
          </section>
        ) : null}

        {technologies.length > 0 ? (
          <section aria-label="Technologies">
            <h2
              className={SECTION_H2_CLASS}
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Technologies
            </h2>
            <div className="mt-6 space-y-6">
              {techGroups.map((group, i) => (
                <div key={group.category ?? `general-${i}`}>
                  {group.category ? (
                    <p className="font-mono text-mono-sm text-muted">{group.category}</p>
                  ) : null}
                  <p
                    className={
                      group.category
                        ? 'mt-1 font-mono text-mono text-ink'
                        : 'font-mono text-mono text-ink'
                    }
                  >
                    {group.items.map((tech) => tech.name).join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {projects.length > 0 ? (
          <section aria-label={`Shipped at ${company}`} className="max-w-none">
            <h2
              className={SECTION_H2_CLASS}
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Shipped at {company}
            </h2>
            <p className="mt-2 max-w-[66ch] text-body text-muted">
              The {projects.length === 1 ? 'project' : `${projects.length} projects`}{' '}
              {projects.length === 1 ? 'that carries' : 'that carry'} this story, in full.
            </p>
            <ul className="mt-6 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortProjectCards(projects).map((project) => (
                <li key={project.slug}>
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </section>
  );
}

export default async function ExperiencePage() {
  let list: ExperienceListItem[];
  try {
    list = await getExperiences();
  } catch (error) {
    console.error('[/experience] list fetch failed:', toApiError(error).detail);
    return (
      <PageShell>
        <ExperienceError detail={toApiError(error).detail ?? 'Unknown error'} />
      </PageShell>
    );
  }

  if (list.length === 0) {
    return (
      <PageShell>
        <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
          Experience
        </p>
        <h1
          className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          Experience
        </h1>
        <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
        <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
          No experiences are published yet. The work index tells the story in
          the meantime — every project carries its context there.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-block text-body font-medium text-ink underline underline-offset-[6px] decoration-accent decoration-2 hover:decoration-ink"
        >
          View the work
        </Link>
      </PageShell>
    );
  }

  // The list row lacks the body fields — fetch each detail. List order is
  // the contract order (order ASC); details map 1:1 onto it.
  let details: ExperienceDetail[];
  try {
    details = await Promise.all(
      list.map((experience) => getExperienceBySlug(experience.slug))
    );
  } catch (error) {
    console.error('[/experience] detail fetch failed:', toApiError(error).detail);
    return (
      <PageShell>
        <ExperienceError detail={toApiError(error).detail ?? 'Unknown error'} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {details.map((experience, i) => (
        <ExperienceStory
          key={experience.slug}
          experience={experience}
          separated={i > 0}
        />
      ))}
    </PageShell>
  );
}

