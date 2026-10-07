/**
 * ProjectCard — the work-index card (F3-08).
 *
 * Batman rule (SESSION.md 2026-10-07): project images are FIRST-CLASS
 * content. The thumbnail leads the card: proper 16/10 aspect box, lazy
 * loading, generous width. No zoom, no glow, no hover scale (blacklist
 * §6/§4.3) — the quiet hover is a hairline→ink border shift plus a title
 * underline, color-only.
 *
 * Structure (brief §2.5): mono overline (type word), title in the display
 * face, one-line description clamp. Featured has no badge — it leads its
 * section (ordering), it doesn't wear decoration.
 */

import type { ProjectCard as ProjectCardData } from '@/library/types/api-v2';
import Link from 'next/link';
import { TYPE_OVERLINE } from './project-sections';

/** 16/10 media box reserved before load — no layout shift when the image lands. */
const THUMB_ASPECT = 'aspect-[16/10]';

export interface ProjectCardProps {
  project: ProjectCardData;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const { slug, title, project_type: projectType, description, thumbnail_url: thumbnailUrl } =
    project;

  return (
    <Link
      href={`/projects/${slug}`}
      className="group block rounded-md border border-line bg-surface transition-[border-color] duration-fast ease-standard hover:border-ink focus-visible:border-ink"
    >
      {thumbnailUrl ? (
        <div className={`overflow-hidden rounded-t-md ${THUMB_ASPECT}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>: thumbnails arrive as absolute cross-origin URLs (R2 media domain), outside the Next optimizer's allowlist; remotePatterns for arbitrary API media hosts is a phase-4 image-pipeline decision. */}
          <img
            src={thumbnailUrl}
            alt={`${title} — preview`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded-t-md bg-surface ${THUMB_ASPECT}`}
          aria-hidden="true"
        >
          <span className="font-mono text-mono-sm text-muted">No preview</span>
        </div>
      )}
      <div className="p-6">
        <p className="font-mono text-overline font-medium uppercase tracking-[0.08em] text-muted">
          {TYPE_OVERLINE[projectType]}
        </p>
        <h3
          className="mt-2 text-title-3 font-semibold tracking-[-0.005em] leading-[1.35] text-ink group-hover:underline group-hover:decoration-accent"
          style={{ fontFamily: 'var(--font-display), var(--font-sans)' }}
        >
          {title}
        </h3>
        <p className="mt-2 text-body text-muted line-clamp-2">{description}</p>
      </div>
    </Link>
  );
}
