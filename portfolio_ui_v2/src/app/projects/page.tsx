/**
 * /projects — the work index (F3-08): the first DATA-DRIVEN page.
 *
 * Server component fetching through the typed v2 client (contract §3.1/§3.2
 * shapes) — no client fetch waterfall: the HTML arrives with the ledger in
 * it. force-dynamic keeps the index off the build-time prerender (the API
 * is not reachable/authoritative at build time).
 *
 * Structure (brief §2.5, binding): grouping is PRIMARY — three sections in
 * fixed order internship → school → personal, each with a title-2 opener +
 * one-line scope note; the mono overline on each card is SECONDARY type
 * metadata. Type never changes color. All projects render (full ledger);
 * featured leads its section by sort, not by badge.
 *
 * Images are first-class (Batman rule 2026-10-07): every card leads with
 * its thumbnail in a reserved 16/10 box, lazy, no hover zoom.
 */

import PageShell from '@/components/PageShell';
import { groupProjectsByType } from '@/components/projects/project-sections';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectSectionHeader from '@/components/projects/ProjectSectionHeader';
import ProjectsError from '@/components/projects/ProjectsError';
import { getProjects, toApiError } from '@/library/api-client';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  let projects;
  try {
    projects = (await getProjects({ limit: 100 })).results;
  } catch (error) {
    // Normalize at the RSC boundary: the client error surface receives a
    // plain string, never the axios error object (functions/classes cannot
    // cross the server→client divide).
    console.error('[/projects] list fetch failed:', toApiError(error).detail);
    return (
      <PageShell>
        <ProjectsError detail={toApiError(error).detail ?? 'Unknown error'} />
      </PageShell>
    );
  }

  const sections = groupProjectsByType(projects);
  const total = projects.length;

  return (
    <PageShell>
      <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
        Index /projects
      </p>
      <h1
        className="mt-4 text-display font-semibold tracking-[-0.02em] leading-[1.10] text-ink"
        style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
      >
        Work
      </h1>
      {/* The one amber rule — brief §1 */}
      <div className="mt-8 h-0.5 w-16 bg-accent" aria-hidden="true" />
      {total === 0 ? (
        <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
          No projects yet. The index fills as work ships — check back soon, or
          write to me from the contact page.
        </p>
      ) : (
        <>
          <p className="mt-8 max-w-[66ch] text-body-lg text-muted">
            {total} projects, grouped as they were earned: internships in
            industry first, then the 42 Paris common core, then things built
            for myself.
          </p>
          <div className="mt-24 space-y-24">
            {sections.map((section) => (
              <section key={section.type} aria-label={section.title}>
                <ProjectSectionHeader section={section} />
                <ul className="mt-6 grid list-none grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.projects.map((project) => (
                    <li key={project.slug}>
                      <ProjectCard project={project} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}
