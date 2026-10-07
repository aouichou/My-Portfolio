/**
 * Behavioral tests — /projects/[slug] page core (F3-09a).
 *
 * Pins the detail page contract:
 * - fetches the detail through the typed client by slug
 * - header block: type overline + display title + description + meta row
 *   (code URL as a plain underlined verb; tech stack as quiet mono list;
 *   score; NO live link when the field is null)
 * - body renders from data present: Overview + Features (non-empty) +
 *   Plates (galleries); Features absent → section absent
 * - 404 → notFound() → the brief-voice 404 flow renders
 * - other API failure → the retryable error surface with the detail line
 *
 * The page is an async SERVER component — tests await the component call
 * and render the resolved element (fetch mocked at the api-client
 * boundary), same pattern as ProjectsPage.test.tsx.
 */

import NotFound from '@/app/not-found';
import ProjectDetailPage from '@/app/projects/[slug]/page';
import { getProjectBySlug } from '@/library/api-client';
import type { ProjectDetail } from '@/library/types/api-v2';
import { cleanup, render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';

afterEach(cleanup);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  notFound: () => {
    // Next throws a sentinel error internally; in jsdom we render the
    // app-level not-found surface directly to pin the 404 flow's UX.
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

jest.mock('@/library/api-client', () => {
  const actual = jest.requireActual('@/library/api-client');
  return {
    ...actual,
    getProjectBySlug: jest.fn(),
  };
});

const getProjectMock = getProjectBySlug as jest.MockedFunction<typeof getProjectBySlug>;

function detail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  return {
    slug: 'philosophers',
    title: 'Philosophers',
    project_type: 'school',
    description:
      'A simulation of the dining philosophers problem, demonstrating synchronization in concurrent systems.',
    readme: null,
    thumbnail_url: 'http://localhost:8000/media/projects/normal_output.png',
    is_featured: false,
    score: 95,
    tech_stack: [{ name: 'C' }, { name: 'pthread' }, { name: 'Mutexes' }],
    features: [
      'Thread-based philosophers with individual mutexes for forks',
      'Process-based philosophers with central fork semaphores',
    ],
    challenges: 'Deadlocks, timing precision.',
    lessons: 'Concurrency tradeoffs.',
    live_url: null,
    code_url: 'https://github.com/aouichou/philosophers',
    video_url: null,
    role_description: null,
    stats: [],
    badges: [],
    impact_metrics: [],
    architecture_description: null,
    architecture_diagrams: [],
    related_documentation: [],
    code_steps: [],
    code_snippets: [],
    has_demo: false,
    demo_commands: [],
    demo_files_path: null,
    galleries: [
      {
        name: 'Program Execution',
        description: 'Demonstration of philosopher states during simulation',
        order: 1,
        images: [
          {
            image_url: 'http://localhost:8000/media/galleries/normal_output.png',
            caption: 'Normal execution with 5 philosophers',
            order: 1,
          },
        ],
      },
    ],
    experience: null,
    order: 0,
    created_at: '2025-11-26T00:00:00Z',
    updated_at: '2025-11-26T00:00:00Z',
    ...overrides,
  };
}

/** Axios-shaped 404 — the page must map it to notFound(). */
function axios404(): AxiosError {
  const error = new AxiosError('Request failed with status code 404');
  error.response = {
    status: 404,
    data: { detail: 'Not found.' },
    statusText: 'Not Found',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

beforeEach(() => {
  getProjectMock.mockReset();
});

describe('/projects/[slug] — header block', () => {
  it('fetches by slug and renders overline, title, lede description', async () => {
    getProjectMock.mockResolvedValue(detail());
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(getProjectMock).toHaveBeenCalledWith('philosophers');
    expect(screen.getByText('School · Philosophers')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Philosophers', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/dining philosophers problem/)).toBeInTheDocument();
  });

  it('renders the meta row: code verb, tech list, score — no live link when null', async () => {
    getProjectMock.mockResolvedValue(detail());
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    const code = screen.getByRole('link', { name: 'View project on GitHub' });
    expect(code).toHaveAttribute('href', 'https://github.com/aouichou/philosophers');
    expect(screen.queryByRole('link', { name: 'View live site' })).not.toBeInTheDocument();
    expect(screen.getByText('C · pthread · Mutexes')).toBeInTheDocument();
    expect(screen.getByText('Score 95/100')).toBeInTheDocument();
  });

  it('prints the live verb only when a live_url exists', async () => {
    getProjectMock.mockResolvedValue(detail({ live_url: 'https://philosophers.example' }));
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByRole('link', { name: 'View live site' })).toHaveAttribute(
      'href',
      'https://philosophers.example'
    );
  });
});

describe('/projects/[slug] — body renders from data present', () => {
  it('renders Overview + Features + Plates sections', async () => {
    getProjectMock.mockResolvedValue(detail());
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByRole('heading', { name: 'Overview', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plates', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Plate 1 — Program Execution')).toBeInTheDocument();
    expect(screen.getByAltText('Normal execution with 5 philosophers')).toBeInTheDocument();
  });

  it('prints the description once (lede) — Overview carries challenges + lessons', async () => {
    getProjectMock.mockResolvedValue(detail());
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    // Lede is the ONLY description render; Overview prints the deeper prose.
    expect(screen.getAllByText(/dining philosophers problem/)).toHaveLength(1);
    expect(screen.getByText('Challenges')).toBeInTheDocument();
    expect(screen.getByText(/Deadlocks, timing precision/)).toBeInTheDocument();
    expect(screen.getByText('Lessons')).toBeInTheDocument();
    expect(screen.getByText(/Concurrency tradeoffs/)).toBeInTheDocument();
  });

  it('omits Overview when neither challenges nor lessons exist', async () => {
    getProjectMock.mockResolvedValue(detail({ challenges: null, lessons: null }));
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByRole('heading', { name: 'Overview' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument();
  });

  it('omits the Features section when the array is empty', async () => {
    getProjectMock.mockResolvedValue(detail({ features: [] }));
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByRole('heading', { name: 'Features' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('omits the Plates section when there are no galleries', async () => {
    getProjectMock.mockResolvedValue(detail({ galleries: [] }));
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByRole('heading', { name: 'Plates' })).not.toBeInTheDocument();
  });
});

describe('/projects/[slug] — failure flows', () => {
  it('maps an API 404 to the not-found flow', async () => {
    getProjectMock.mockRejectedValue(axios404());
    await expect(
      ProjectDetailPage({ params: Promise.resolve({ slug: 'no-such-project' }) })
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('the 404 flow renders the brief-voice surface (no page at this address)', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'This address has no page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '/projects');
  });

  it('other failures render the retryable error surface with the API detail', async () => {
    getProjectMock.mockRejectedValue(new Error('Network Error'));
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByText("This project didn't arrive")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('philosophers')).toBeInTheDocument();
  });
});

describe('/projects/[slug] — slice-2 sections (F3-09b)', () => {
  it('renders the Architecture section when a mermaid diagram exists', async () => {
    getProjectMock.mockResolvedValue(
      detail({
        architecture_description: 'Threads, a shared table, and a monitor.',
        architecture_diagrams: [
          { title: 'Architecture', type: 'mermaid', content: 'graph TD\n    A --> B', description: '' },
        ],
      })
    );
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByRole('heading', { name: 'Architecture', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Threads, a shared table, and a monitor.')).toBeInTheDocument();
    expect(screen.getByText('Fig. 1 — Architecture')).toBeInTheDocument();
  });

  it('renders the Code section: run steps + snippet plates', async () => {
    getProjectMock.mockResolvedValue(
      detail({
        code_steps: ['Clone the repository', 'Run make'],
        code_snippets: [
          { title: 'Monitoring', description: 'Death watch', language: 'c', code: 'void *monitor(){}' },
        ],
      })
    );
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByRole('heading', { name: 'Code', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Run steps')).toBeInTheDocument();
    expect(screen.getByText('Clone the repository')).toBeInTheDocument();
    expect(screen.getByText('Snippets')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('omits Architecture and Code when the data is absent', async () => {
    getProjectMock.mockResolvedValue(detail());
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByRole('heading', { name: 'Architecture' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Code' })).not.toBeInTheDocument();
  });

  it('renders NOTHING demo-related when has_demo=false despite demo_commands', async () => {
    getProjectMock.mockResolvedValue(
      detail({
        has_demo: false,
        demo_commands: [{ label: 'Run', command: './philo 5 800 200 200' }],
      })
    );
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByRole('heading', { name: 'Demo' })).not.toBeInTheDocument();
    expect(screen.queryByText('./philo 5 800 200 200')).not.toBeInTheDocument();
    expect(screen.queryByText(/Live terminal arrives/i)).not.toBeInTheDocument();
  });

  it('renders the Demo section + mount box when has_demo=true', async () => {
    getProjectMock.mockResolvedValue(
      detail({
        has_demo: true,
        demo_commands: [{ label: 'Run', command: './philo 5 800 200 200' }],
      })
    );
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.getByRole('heading', { name: 'Demo', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('./philo 5 800 200 200')).toBeInTheDocument();
    expect(screen.getByText(/Live terminal arrives with the demo system/i)).toBeInTheDocument();
  });

  it('renders the Facts section for internship-rich payloads (stats + impact + docs)', async () => {
    getProjectMock.mockResolvedValue(
      detail({
        project_type: 'internship',
        stats: [{ label: 'Coverage', value: '85%' }],
        impact_metrics: [{ label: 'Reusability Score', value: '85%' }],
        related_documentation: [{ title: 'QA Internship Report' }],
      })
    );
    const page = await ProjectDetailPage({
      params: Promise.resolve({ slug: 'clinical-analytics-platform' }),
    });
    render(page);
    expect(screen.getByRole('heading', { name: 'Facts', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('Reusability Score')).toBeInTheDocument();
    expect(screen.getByText('QA Internship Report')).toBeInTheDocument();
  });

  it('renders no readme content anywhere (structured sections supersede it)', async () => {
    getProjectMock.mockResolvedValue(
      detail({ readme: '<p>raw readme html that must never print</p>' })
    );
    const page = await ProjectDetailPage({ params: Promise.resolve({ slug: 'philosophers' }) });
    render(page);
    expect(screen.queryByText(/raw readme html/i)).not.toBeInTheDocument();
  });
});
