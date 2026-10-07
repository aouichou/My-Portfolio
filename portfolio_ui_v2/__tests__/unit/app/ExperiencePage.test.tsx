/**
 * Behavioral tests — /experience page (F3-10).
 *
 * Pins the experience page contract:
 * - fetches the §3.4 list, then the §3.5 detail per slug (list lacks
 *   overview/technologies/impact — detail is the body's source)
 * - renders the story FROM DATA: company h1, role EXACTLY as served
 *   (Batman D4: "Fullstack Engineer intern"), period, duration, count
 * - impact metrics + stats render in the InternshipFacts voice
 * - the three linked projects render as ProjectCards (same shape as the
 *   work index) linking to their detail routes
 * - overview `**bold**` markers resolve — no literal asterisks in the DOM
 * - data-driven future: 2 experiences → 2 story sections
 * - API down → the retryable error surface with the detail line
 * - empty list → the quiet empty state with the work-index door
 *
 * The page is an async SERVER component — tests await the component call
 * and render the resolved element (fetch mocked at the api-client
 * boundary), same pattern as ProjectsPage.test.tsx.
 */

import ExperiencePage from '@/app/experience/page';
import { getExperienceBySlug, getExperiences } from '@/library/api-client';
import type { ExperienceDetail, ExperienceListItem } from '@/library/types/api-v2';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/library/api-client', () => {
  const actual = jest.requireActual('@/library/api-client');
  return {
    ...actual,
    getExperiences: jest.fn(),
    getExperienceBySlug: jest.fn(),
  };
});

const listMock = getExperiences as jest.MockedFunction<typeof getExperiences>;
const detailMock = getExperienceBySlug as jest.MockedFunction<typeof getExperienceBySlug>;

/** §3.4 list row — light shape. */
function listRow(overrides: Partial<ExperienceListItem> = {}): ExperienceListItem {
  return {
    slug: 'qynapse-healthcare',
    company: 'Qynapse',
    role: 'Fullstack Engineer intern',
    subtitle: 'Building secure, scalable healthcare analytics platform with AI-powered neuroimaging',
    start_date: '2025-05-12',
    end_date: '2025-11-11',
    period_display: 'May 2025 - Nov 2025',
    stats: [],
    project_count: 3,
    is_active: true,
    order: 1,
    ...overrides,
  };
}

/** §3.5 detail — the full story shape (grounded in the live payload). */
function detail(overrides: Partial<ExperienceDetail> = {}): ExperienceDetail {
  return {
    ...listRow(),
    overview:
      '**About Qynapse:**\nQynapse is a healthcare AI company specializing in neuroimaging analysis.\n\n**Role & Contributions:**\nLed fullstack development for a HIPAA-compliant healthcare analytics platform.',
    technologies: [
      { name: 'Python' },
      { name: 'FastAPI' },
      { name: 'Next.js' },
      { name: 'Keycloak' },
    ],
    impact_metrics: [
      {
        label: 'Testing',
        value: '55 integration tests ensuring production reliability',
      },
      {
        label: 'Reusability',
        value: 'Keycloak library deployed company-wide across 2 production applications',
      },
    ],
    architecture_description: null,
    architecture_diagrams: [],
    code_samples: [],
    documentation: [{ title: 'OAuth2/OIDC Authentication Flows', category: 'Security' }],
    duration_months: 7,
    projects: [
      {
        slug: 'clinical-analytics-platform',
        title: 'Clinical Analytics Platform',
        project_type: 'internship',
        description: 'Aggregating patient cohort data from the QyScore backend.',
        is_featured: true,
        has_demo: false,
        thumbnail_url: 'http://localhost:8000/media/projects/clinical.png',
        tech_stack: [{ name: 'FastAPI' }],
        order: 1,
      },
      {
        slug: 'keycloak-integration-library',
        title: 'Keycloak Integration Library',
        project_type: 'internship',
        description: 'Project-agnostic Keycloak integration package.',
        is_featured: false,
        has_demo: false,
        thumbnail_url: 'http://localhost:8000/media/projects/keycloak.png',
        tech_stack: [{ name: 'Python' }],
        order: 2,
      },
      {
        slug: 'patient-monitoring-module',
        title: 'Patient Monitoring Module',
        project_type: 'internship',
        description: 'DDD-based module for the flagship application.',
        is_featured: false,
        has_demo: false,
        thumbnail_url: 'http://localhost:8000/media/projects/patient.png',
        tech_stack: [{ name: 'FastAPI' }],
        order: 3,
      },
    ],
    created_at: '2025-11-26T00:00:00Z',
    updated_at: '2025-11-26T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  listMock.mockReset();
  detailMock.mockReset();
});

describe('/experience — the story renders from data', () => {
  it('fetches the list, then the detail by slug', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(detailMock).toHaveBeenCalledWith('qynapse-healthcare');
  });

  it('renders the company as the h1 with the lede subtitle', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Qynapse' })
    ).toBeInTheDocument();
    // The subtitle lede, queried by its full served text (the overview
    // prose shares individual words with it).
    expect(
      screen.getByText(
        'Building secure, scalable healthcare analytics platform with AI-powered neuroimaging'
      )
    ).toBeInTheDocument();
  });

  it('renders the role EXACTLY as the API serves it — Fullstack Engineer intern', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    const { container } = render(await ExperiencePage());
    expect(container.textContent).toContain('Fullstack Engineer intern');
    // The D4 fact, pinned: never a different role title.
    expect(container.textContent).not.toContain('Software Engineer Intern');
  });

  it('renders the served period, duration, and project count in the mono facts row', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(screen.getByText('May 2025 - Nov 2025')).toBeInTheDocument();
    expect(screen.getByText('7 months')).toBeInTheDocument();
    expect(screen.getByText('3 projects')).toBeInTheDocument();
  });

  it('renders impact metrics in the InternshipFacts voice', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(
      screen.getByText('55 integration tests ensuring production reliability')
    ).toBeInTheDocument();
    expect(screen.getByText('Reusability')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('OAuth2/OIDC Authentication Flows')).toBeInTheDocument();
  });

  it('renders the technologies list', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(screen.getByText('Python · FastAPI · Next.js · Keycloak')).toBeInTheDocument();
  });

  it('renders the three linked projects as ProjectCards under the shipped heading', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    render(await ExperiencePage());
    expect(
      screen.getByRole('heading', { level: 2, name: 'Shipped at Qynapse' })
    ).toBeInTheDocument();
    const titles = [
      'Clinical Analytics Platform',
      'Keycloak Integration Library',
      'Patient Monitoring Module',
    ];
    for (const title of titles) {
      expect(screen.getByAltText(`${title} — preview`)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('link', { name: /clinical analytics platform/i })
    ).toHaveAttribute('href', '/projects/clinical-analytics-platform');
    // Featured leads the shipped grid.
    const clinical = screen.getByAltText('Clinical Analytics Platform — preview');
    const patient = screen.getByAltText('Patient Monitoring Module — preview');
    expect(
      clinical.compareDocumentPosition(patient) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('resolves **bold** markers in the overview — no literal asterisks in the DOM', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockResolvedValue(detail());
    const { container } = render(await ExperiencePage());
    expect(container.textContent).not.toContain('**');
    expect(screen.getByText('About Qynapse:')).toBeInTheDocument();
    expect(screen.getByText('Role & Contributions:')).toBeInTheDocument();
  });
});

describe('/experience — data-driven for more than one story', () => {
  it('renders two story sections when the API serves two experiences', async () => {
    const rows = [
      listRow(),
      listRow({
        slug: 'second-co',
        company: 'Second Co',
        role: 'Backend Engineer intern',
        period_display: 'Jan 2026 - Present',
        project_count: 1,
        order: 2,
      }),
    ];
    listMock.mockResolvedValue(rows);
    detailMock.mockImplementation(async (slug: string) => {
      if (slug === 'second-co') {
        return detail({
          slug: 'second-co',
          company: 'Second Co',
          role: 'Backend Engineer intern',
          period_display: 'Jan 2026 - Present',
          project_count: 1,
          projects: detail().projects.slice(0, 1),
        });
      }
      return detail();
    });
    render(await ExperiencePage());
    const first = screen.getByRole('heading', { level: 1, name: 'Qynapse' });
    const second = screen.getByRole('heading', { level: 1, name: 'Second Co' });
    expect(first).toBeInTheDocument();
    expect(second).toBeInTheDocument();
    // Contract order preserved: list order is render order.
    expect(
      first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText('Backend Engineer intern')).toBeInTheDocument();
    expect(screen.getByText('1 project')).toBeInTheDocument();
  });
});

describe('/experience — failure + empty states', () => {
  it('states what happened and offers retry when the list fetch fails', async () => {
    listMock.mockRejectedValue(new Error('Network Error'));
    render(await ExperiencePage());
    expect(screen.getByText("The experience didn't arrive")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });

  it('shows the same error surface when a detail fetch fails', async () => {
    listMock.mockResolvedValue([listRow()]);
    detailMock.mockRejectedValue(new Error('Internal error'));
    render(await ExperiencePage());
    expect(screen.getByText("The experience didn't arrive")).toBeInTheDocument();
  });

  it('renders the quiet empty state with the work-index door when no experiences exist', async () => {
    listMock.mockResolvedValue([]);
    render(await ExperiencePage());
    expect(screen.getByText(/No experiences are published yet/i)).toBeInTheDocument();
    const door = screen.getByRole('link', { name: 'View the work' });
    expect(door).toHaveAttribute('href', '/projects');
  });
});
