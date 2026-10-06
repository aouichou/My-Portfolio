/**
 * Behavioral tests — /projects page (F3-08), the first data-driven page.
 *
 * Pins the work-index page contract:
 * - fetches ALL projects through the typed client (limit 100 — the full
 *   ledger, Q1: nothing gated behind featured)
 * - renders three type-distinct sections in fixed order with title-2
 *   openers + scope notes; ALL cards render across sections
 * - API-down: the error surface states what happened + offers retry
 *   (brief §5.6), with the API's detail line
 * - empty ledger: an inviting empty state (quality floor)
 * - thumbnails reach the DOM as absolute URLs from the serializer
 *
/**
 * The page is an async SERVER component — RTL's render does not await the
 * component's promise, so tests await the component call itself and render
 * the resolved element tree (the fetch is mocked at the api-client
 * boundary).
 */

import ProjectsPage from '@/app/projects/page';
import { getProjects } from '@/library/api-client';
import type { PaginatedProjects, ProjectCard } from '@/library/types/api-v2';
import { cleanup, render, screen } from '@testing-library/react';

// Strict DOM isolation: this suite queries by exact alt/role, so leftover
// trees from a previous test must not leak (auto-cleanup is not guaranteed
// under ts-jest without globals).
afterEach(cleanup);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/library/api-client', () => {
  const actual = jest.requireActual('@/library/api-client');
  return {
    ...actual,
    getProjects: jest.fn(),
  };
});

const getProjectsMock = getProjects as jest.MockedFunction<typeof getProjects>;

function card(overrides: Partial<ProjectCard> = {}): ProjectCard {
  const base: ProjectCard = {
    slug: 'minishell',
    title: 'Minishell',
    project_type: 'school',
    description: 'A custom shell implementation in C, part of the 42 Paris curriculum.',
    is_featured: false,
    has_demo: false,
    thumbnail_url: 'http://localhost:8000/media/projects/minishell.png',
    tech_stack: [{ name: 'C' }],
    order: 0,
  };
  const merged = { ...base, ...overrides };
  // Derive unique title/thumbnail from the slug when not pinned explicitly —
  // the ledger assertions query by exact alt/role name per project.
  return {
    ...merged,
    title: overrides.title ?? merged.slug.replaceAll('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    thumbnail_url:
      overrides.thumbnail_url ?? `http://localhost:8000/media/projects/${merged.slug}.png`,
  };
}

function envelope(results: ProjectCard[]): PaginatedProjects {
  return { count: results.length, next: null, previous: null, results };
}

const LEDGER: ProjectCard[] = [
  card({ slug: 'clinical-analytics-platform', project_type: 'internship', order: 1 }),
  card({ slug: 'keycloak-integration-library', project_type: 'internship', order: 2 }),
  card({ slug: 'patient-monitoring-module', project_type: 'internship', order: 3 }),
  card({ slug: 'minishell', project_type: 'school', order: 0, is_featured: true }),
  card({ slug: 'minirt', project_type: 'school', order: 0, is_featured: true }),
  card({ slug: 'philosophers', project_type: 'school', order: 0 }),
  card({ slug: 'push-swap', project_type: 'school', order: 0 }),
  card({ slug: 'fdf-wireframe-renderer', project_type: 'school', order: 0 }),
  card({ slug: 'ft-irc-server', project_type: 'school', order: 0 }),
  card({ slug: 'ft_transcendence', project_type: 'school', order: 0, is_featured: true }),
  card({ slug: 'minitalk', project_type: 'school', order: 0 }),
  card({ slug: 'mistral-realms', project_type: 'personal', is_featured: true }),
];

beforeEach(() => {
  getProjectsMock.mockReset();
});

describe('/projects — the full ledger renders', () => {
  it('fetches with limit 100 (nothing gated behind featured)', async () => {
    getProjectsMock.mockResolvedValue(envelope(LEDGER));
    render(await ProjectsPage());
    expect(getProjectsMock).toHaveBeenCalledWith({ limit: 100 });
  });

  it('renders all 12 cards with their thumbnails and links', async () => {
    getProjectsMock.mockResolvedValue(envelope(LEDGER));
    render(await ProjectsPage());
    for (const project of LEDGER) {
      expect(screen.getByAltText(`${project.title} — preview`)).toHaveAttribute(
        'src',
        project.thumbnail_url
      );
      expect(
        screen.getByRole('link', { name: new RegExp(project.title, 'i') })
      ).toHaveAttribute('href', `/projects/${project.slug}`);
    }
  });

  it('renders three type-distinct sections in fixed order with scope notes', async () => {
    getProjectsMock.mockResolvedValue(envelope(LEDGER));
    render(await ProjectsPage());
    const internship = screen.getByRole('heading', { name: 'Internship — Qynapse' });
    const school = screen.getByRole('heading', { name: 'School — 42 Paris' });
    const personal = screen.getByRole('heading', { name: 'Personal' });
    expect(internship).toBeInTheDocument();
    expect(school).toBeInTheDocument();
    expect(personal).toBeInTheDocument();
    // Fixed order: internship precedes school precedes personal in the DOM.
    expect(
      internship.compareDocumentPosition(school) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      school.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // Scope notes present (structure carries the type meaning).
    expect(screen.getByText(/clinical research/i)).toBeInTheDocument();
    expect(screen.getByText(/common-core systems programming/i)).toBeInTheDocument();
  });

  it('states the school as 42 Paris — never 1337', async () => {
    getProjectsMock.mockResolvedValue(envelope(LEDGER));
    const { container } = render(await ProjectsPage());
    expect(container.textContent).toContain('42 Paris');
    expect(container.textContent).not.toContain('1337');
  });

  it('leads featured within sections but renders every project', async () => {
    getProjectsMock.mockResolvedValue(envelope(LEDGER));
    render(await ProjectsPage());
    // Featured minishell precedes unfeatured push-swap inside the school section.
    const minishell = screen.getByAltText('Minishell — preview');
    const pushSwap = screen.getByAltText('Push Swap — preview');
    expect(
      minishell.compareDocumentPosition(pushSwap) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // And the unfeatured ones are all still present.
    expect(screen.getByText('Philosophers')).toBeInTheDocument();
    expect(screen.getByText('Minitalk')).toBeInTheDocument();
  });
});

describe('/projects — API down', () => {
  it('states what happened and offers retry with the API detail line', async () => {
    getProjectsMock.mockRejectedValue(new Error('Network Error'));
    render(await ProjectsPage());
    expect(screen.getByText("The projects list didn't arrive")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });
});

describe('/projects — empty ledger', () => {
  it('invites action instead of rendering an empty frame', async () => {
    getProjectsMock.mockResolvedValue(envelope([]));
    render(await ProjectsPage());
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /minishell/i })).not.toBeInTheDocument();
  });
});
