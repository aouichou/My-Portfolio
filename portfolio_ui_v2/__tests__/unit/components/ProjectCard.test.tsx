/**
 * Behavioral tests — ProjectCard + project-sections (F3-08).
 *
 * Pins the work-index card contract:
 * - thumbnail renders FIRST-CLASS: <img> with correct src + alt "title —
 *   preview", lazy + async decoding, 16/10 reserved box
 * - missing thumbnail → quiet "No preview" box, no broken <img>
 * - link targets /projects/{slug}; overline states the TYPE word
 *   (§2.5: type distinction visible as text, never color/emoji)
 * - title renders in the card; description renders (clamped via CSS only)
 * - grouping: fixed section order internship → school → personal;
 *   featured leads within a section; empty sections omitted
 *
 * jsdom cannot load images or compute Tailwind; the clamp/aspect are
 * asserted via class names that produce them (line-clamp-2, aspect-[16/10])
 * — the tokens themselves are guarded by scripts/check-tokens.mjs.
 */

import ProjectCard from '@/components/projects/ProjectCard';
import { groupProjectsByType, TYPE_OVERLINE } from '@/components/projects/project-sections';
import type { ProjectCard as ProjectCardData, ProjectType } from '@/library/types/api-v2';
import { render, screen } from '@testing-library/react';

function makeCard(overrides: Partial<ProjectCardData> = {}): ProjectCardData {
  return {
    slug: 'minishell',
    title: 'Minishell',
    project_type: 'school',
    description: 'A custom shell implementation in C, developed as part of the 42 Paris curriculum.',
    is_featured: true,
    has_demo: true,
    thumbnail_url: 'http://localhost:8000/media/projects/minishell.png',
    tech_stack: [{ name: 'C' }],
    order: 0,
    ...overrides,
  };
}

describe('ProjectCard — thumbnail is first-class', () => {
  it('renders the thumbnail with lazy loading and a descriptive alt', () => {
    render(<ProjectCard project={makeCard()} />);
    const img = screen.getByAltText('Minishell — preview');
    expect(img).toHaveAttribute('src', 'http://localhost:8000/media/projects/minishell.png');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('reserves the 16/10 media box so late images cannot shift layout', () => {
    const { container } = render(<ProjectCard project={makeCard()} />);
    expect(container.querySelector('.aspect-\\[16\\/10\\]')).not.toBeNull();
  });

  it('shows a quiet placeholder when the project has no thumbnail', () => {
    render(<ProjectCard project={makeCard({ thumbnail_url: null, slug: 'bare', title: 'Bare' })} />);
    expect(screen.getByText('No preview')).toBeInTheDocument();
    expect(screen.queryByAltText('Bare — preview')).not.toBeInTheDocument();
  });
});

describe('ProjectCard — structure encodes the type', () => {
  it.each<[ProjectType, string]>([
    ['school', 'School'],
    ['internship', 'Internship'],
    ['personal', 'Personal'],
  ])('overline states the type word for %s', (type, expected) => {
    render(<ProjectCard project={makeCard({ project_type: type })} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('links to the project detail route by slug', () => {
    render(<ProjectCard project={makeCard({ slug: 'ft_transcendence' })} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/ft_transcendence');
  });

  it('renders title and description', () => {
    render(<ProjectCard project={makeCard()} />);
    expect(screen.getByText('Minishell')).toBeInTheDocument();
    expect(
      screen.getByText(/A custom shell implementation in C/)
    ).toBeInTheDocument();
  });

  it('clamps the description to two lines via utility class', () => {
    const { container } = render(<ProjectCard project={makeCard()} />);
    const para = container.querySelector('p.line-clamp-2');
    expect(para).not.toBeNull();
    expect(para?.textContent).toContain('custom shell');
  });
});

describe('project-sections — grouping is primary (§2.5)', () => {
  it('renders sections in the fixed order internship → school → personal', () => {
    const sections = groupProjectsByType([
      makeCard({ slug: 'a', project_type: 'personal', order: 0 }),
      makeCard({ slug: 'b', project_type: 'school', order: 0 }),
      makeCard({ slug: 'c', project_type: 'internship', order: 0 }),
    ]);
    expect(sections.map((s) => s.type)).toEqual(['internship', 'school', 'personal']);
  });

  it('places featured projects first within a section, then API order', () => {
    const sections = groupProjectsByType([
      makeCard({ slug: 'plain', project_type: 'school', is_featured: false, order: 0 }),
      makeCard({ slug: 'feat-b', project_type: 'school', is_featured: true, order: 5 }),
      makeCard({ slug: 'feat-a', project_type: 'school', is_featured: true, order: 1 }),
    ]);
    expect(sections[0]?.projects.map((p) => p.slug)).toEqual(['feat-a', 'feat-b', 'plain']);
  });

  it('omits sections with zero projects — structure encodes truth', () => {
    const sections = groupProjectsByType([
      makeCard({ slug: 'only', project_type: 'personal', order: 0 }),
    ]);
    expect(sections.map((s) => s.type)).toEqual(['personal']);
  });

  it('carries the 42 Paris fact in the school section copy — never 1337', () => {
    const sections = groupProjectsByType([makeCard({ project_type: 'school' })]);
    expect(sections[0]?.title).toContain('42 Paris');
    expect(sections[0]?.title).not.toContain('1337');
  });

  it('carries Qynapse in the internship section copy', () => {
    const sections = groupProjectsByType([makeCard({ project_type: 'internship' })]);
    expect(sections[0]?.title).toContain('Qynapse');
  });

  it('TYPE_OVERLINE covers every contract type', () => {
    expect(Object.keys(TYPE_OVERLINE).sort()).toEqual(['internship', 'personal', 'school']);
  });
});
