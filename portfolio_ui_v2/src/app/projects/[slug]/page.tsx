/**
 * /projects/[slug] — project detail, page core (F3-09a slice 1).
 *
 * Editorial one-column reading flow (approved concept): ~66ch measure,
 * section rhythm per brief §2.3. The hero is the project itself — type
 * overline + display title + one-line description + meta row (live/code
 * links as plain underlined text verbs, tech stack as a quiet mono list).
 * Images are FIRST-CLASS (Batman rule): galleries print as numbered
 * plates below the prose.
 *
 * Body sections render FROM DATA PRESENT (structure encodes truth):
 * Overview (description), Features (when non-empty), Plates (galleries).
 * Slice-2 composition slots are marked inline below — Architecture, Code,
 * Demo slot in at the same rhythm.
 *
 * Fetch: typed client (contract §3.3); 404 → notFound() → the brief-voice
 * 404 surface; other failures → the detail error surface with retry.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isAxiosError } from 'axios';
import PageShell from '@/components/PageShell';
import GalleryPlates from '@/components/projects/GalleryPlates';
import ProjectDetailError from '@/components/projects/ProjectDetailError';
import { TYPE_OVERLINE } from '@/components/projects/project-sections';
import { getProjectBySlug, toApiError } from '@/library/api-client';
import type { ProjectDetail } from '@/library/types/api-v2';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const project = await getProjectBySlug(slug);
    return { title: `${project.title} — My-Portfolio`, description: project.description };
  } catch {
    // Metadata must never break the page; the page body owns the failure UX.
    return { title: 'My-Portfolio' };
  }
}

/** Plain underlined text verb — the meta row's link voice (§5.5). */
const META_LINK_CLASS =
  'text-body font-medium text-ink underline underline-offset-[6px] decoration-accent decoration-2 hover:decoration-ink';

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;

  let project: ProjectDetail;
  try {
    project = await getProjectBySlug(slug);
  } catch (error) {
    // 404 is a CONTENT state (no such project) → the brief-voice 404 flow.
    // Anything else is an API failure → the retryable error surface.
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    console.error('[/projects/[slug]] detail fetch failed:', toApiError(error).detail);
    return (
      <PageShell>
        <ProjectDetailError detail={toApiError(error).detail ?? 'Unknown error'} slug={slug} />
      </PageShell>
    );
  }

  const {
    title,
    project_type: projectType,
    description,
    tech_stack: techStack,
    features,
    challenges,
    lessons,
    live_url: liveUrl,
    code_url: codeUrl,
    video_url: videoUrl,
    galleries,
    score,
  } = project;

  // The lede already carries `description`; Overview prints the deeper
  // prose the payload holds (challenges / lessons) instead of repeating
  // it. Section renders from data present — absent both → omitted.
  const hasOverviewProse = Boolean(challenges) || Boolean(lessons);

  return (
    <PageShell>
      {/* --- Header block --------------------------------------------- */}
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        {TYPE_OVERLINE[projectType]} · {title}
      </p>
      <h1
        className="mt-4 max-w-[20ch] text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        {title}
      </h1>
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      <p className="mt-8 max-w-[66ch] text-body-lg text-muted">{description}</p>

      {/* --- Meta row: verbs + quiet mono facts ------------------------ */}
      <div className="mt-8 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-b border-line pb-8">
        {liveUrl ? (
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={META_LINK_CLASS}>
            View live site
          </a>
        ) : null}
        {codeUrl ? (
          <a href={codeUrl} target="_blank" rel="noopener noreferrer" className={META_LINK_CLASS}>
            View project on GitHub
          </a>
        ) : null}
        {videoUrl ? (
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className={META_LINK_CLASS}>
            Watch the video
          </a>
        ) : null}
        {score !== null ? (
          <span className="font-mono text-mono-sm text-muted">Score {score}/100</span>
        ) : null}
        {techStack.length > 0 ? (
          <span className="font-mono text-mono-sm text-muted">
            {techStack.map((tech) => tech.name).join(' · ')}
          </span>
        ) : null}
      </div>

      {/* --- Body: sections render from data present ------------------- */}
      <div className="mt-24 max-w-[66ch] space-y-24">
        {hasOverviewProse ? (
          <section aria-label="Overview">
            <h2
              className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Overview
            </h2>
            {challenges ? (
              <div className="mt-6">
                <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
                  Challenges
                </p>
                <p className="mt-2 whitespace-pre-line text-body text-ink">{challenges}</p>
              </div>
            ) : null}
            {lessons ? (
              <div className="mt-6">
                <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
                  Lessons
                </p>
                <p className="mt-2 whitespace-pre-line text-body text-ink">{lessons}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* SLICE-2 SLOT: Architecture (architecture_description + diagrams) */}

        {features.length > 0 ? (
          <section aria-label="Features">
            <h2
              className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Features
            </h2>
            <ul className="mt-4 list-none space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3 text-body text-ink">
                  <span aria-hidden="true" className="mt-[0.7em] h-px w-4 shrink-0 bg-line" />
                  {feature}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* SLICE-2 SLOT: Code (code_steps + code_snippets) */}

        {galleries.length > 0 ? (
          <section aria-label="Plates" className="max-w-none">
            <h2
              className="text-title-2 font-semibold tracking-[-0.01em] leading-[1.25] text-ink"
              style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
            >
              Plates
            </h2>
            <div className="mt-12 space-y-24">
              <GalleryPlates galleries={galleries} />
            </div>
          </section>
        ) : null}

        {/* SLICE-2 SLOT: Demo (has_demo + demo_commands → terminal entry) */}
      </div>
    </PageShell>
  );
}
