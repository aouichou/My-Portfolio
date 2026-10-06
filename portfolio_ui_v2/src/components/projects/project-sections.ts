/**
 * project-sections — the work-index grouping (F3-08).
 *
 * Brief §2.5 (binding): grouping is PRIMARY. The index renders three
 * sections in a FIXED order — internship → school → personal — each opened
 * by a title-2 + one-line scope note. Type is encoded structurally, never
 * by color/emoji/chips.
 *
 * Content facts (Batman rules, SESSION.md 2026-10-07): the school is
 * 42 Paris — never 1337. Qynapse role: Fullstack Engineer intern
 * (brief header, confirmed).
 */

import type { ProjectCard, ProjectType } from '@/library/types/api-v2';

export interface ProjectSection {
  type: ProjectType;
  /** title-2 opener, display face. */
  title: string;
  /** One-line scope note, muted body. */
  scope: string;
  /** Cards in this section: featured first, then API order, then title. */
  projects: ProjectCard[];
}

/** Fixed section order + copy — the single source for both. */
const SECTION_DEFS: Array<Omit<ProjectSection, 'projects'>> = [
  {
    type: 'internship',
    title: 'Internship — Qynapse',
    scope: 'Six months building a neuroimaging platform used in clinical research.',
  },
  {
    type: 'school',
    title: 'School — 42 Paris',
    scope: 'Common-core systems programming in C and C++, plus a full-stack capstone.',
  },
  {
    type: 'personal',
    title: 'Personal',
    scope: 'Built for myself, shipped to users.',
  },
];

/** Type word for the card overline — §2.5 overline is SECONDARY metadata. */
export const TYPE_OVERLINE: Record<ProjectType, string> = {
  school: 'School',
  internship: 'Internship',
  personal: 'Personal',
};

/**
 * Group cards into the fixed section order. Within a section: featured
 * leads (is_featured desc), then the API order field, then title for
 * determinism when order ties. Sections with zero projects are omitted —
 * structure encodes truth, and an empty section is not truth.
 */
export function groupProjectsByType(projects: ProjectCard[]): ProjectSection[] {
  return SECTION_DEFS.map((def) => ({
    ...def,
    projects: projects
      .filter((project) => project.project_type === def.type)
      .sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          a.order - b.order ||
          a.title.localeCompare(b.title)
      ),
  })).filter((section) => section.projects.length > 0);
}
