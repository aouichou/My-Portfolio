/**
 * Behavioral tests — / homepage: terminal-as-hero (F3-14, THE signature).
 *
 * Pins the homepage contract:
 * - the nameplate chassis renders (name, lede, ONE amber rule)
 * - the terminal mount point: region labeled, dormant until first
 *   interaction (session frugality — no LiveTerminal mount on load),
 *   activates on click, gates on has_demo
 * - degradation: has_demo=false (prod today) or fetch failure → the quiet
 *   "Demo offline" plate + door to the project page; NO fake terminal
 * - featured work: only is_featured cards render (homepage IS the
 *   featuring surface, Q1)
 * - first-contact motion: the fc-* classes are present AND the CSS
 *   contract holds (animations scale by --motion-scale; the
 *   prefers-reduced-motion media query zeroes the dial)
 *
 * The page is an async SERVER component — same await-the-component
 * pattern as ProjectsPage.test.tsx. LiveTerminal is stubbed: these tests
 * own the MOUNT decision; the component's own capture suite owns the
 * wire protocol.
 */

import Home, { metadata } from '@/app/page';
import { getProjectBySlug, getProjects } from '@/library/api-client';
import type { PaginatedProjects, ProjectCard, ProjectDetail } from '@/library/types/api-v2';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/library/api-client', () => {
  const actual = jest.requireActual('@/library/api-client');
  return {
    ...actual,
    getProjects: jest.fn(),
    getProjectBySlug: jest.fn(),
  };
});

// Stub the live pane: the homepage owns the mount decision; the component
// suite (LiveTerminal.test.tsx) owns token mint + WS wire behavior.
jest.mock('@/components/LiveTerminal', () => ({
  __esModule: true,
  default: function LiveTerminalStub() {
    return <div data-testid="live-terminal-stub">LIVE</div>;
  },
}));

const getProjectsMock = getProjects as jest.MockedFunction<typeof getProjects>;
const getProjectMock = getProjectBySlug as jest.MockedFunction<typeof getProjectBySlug>;

function card(overrides: Partial<ProjectCard> = {}): ProjectCard {
  const base: ProjectCard = {
    slug: 'minishell',
    title: 'Minishell',
    project_type: 'school',
    description: 'A custom shell implementation in C.',
    is_featured: false,
    has_demo: false,
    thumbnail_url: null,
    tech_stack: [],
    order: 0,
  };
  return { ...base, ...overrides };
}

function envelope(results: ProjectCard[]): PaginatedProjects {
  return { count: results.length, next: null, previous: null, results };
}

const LEDGER: ProjectCard[] = [
  card({ slug: 'mistral-realms', title: 'Mistral Realms', project_type: 'personal', is_featured: true, order: 1 }),
  card({ slug: 'minishell', title: 'Minishell', project_type: 'school', is_featured: true, order: 2 }),
  card({ slug: 'clinical-analytics-platform', title: 'Clinical Analytics Platform', project_type: 'internship', is_featured: true, order: 3 }),
  card({ slug: 'philosophers', title: 'Philosophers', project_type: 'school', order: 4 }),
  card({ slug: 'push-swap', title: 'Push Swap', project_type: 'school', order: 5 }),
];

function demoDetail(hasDemo: boolean): ProjectDetail {
  return { slug: 'minishell', has_demo: hasDemo } as ProjectDetail;
}

beforeEach(() => {
  getProjectsMock.mockReset();
  getProjectMock.mockReset();
  getProjectMock.mockResolvedValue(demoDetail(true));
  getProjectsMock.mockResolvedValue(envelope(LEDGER));
});

describe('homepage — nameplate chassis + terminal mount point', () => {
  it('renders the nameplate: name, lede, and exactly one amber rule', async () => {
    render(await Home());
    expect(screen.getByRole('heading', { level: 1, name: 'Amine Aouichou' })).toBeInTheDocument();
    expect(screen.getByText(/build web services and the infrastructure/i)).toBeInTheDocument();
    // The one amber line (brief §1) — the rule element carries fc-rule.
    const rule = document.querySelector('.fc-rule');
    expect(rule).not.toBeNull();
  });

  it('renders the terminal region with its accessible label', async () => {
    render(await Home());
    expect(
      screen.getByRole('region', { name: /live terminal — minishell demo/i })
    ).toBeInTheDocument();
  });

  it('does NOT mount LiveTerminal on page load (session frugality)', async () => {
    render(await Home());
    // The dormant plate renders; the live pane does not.
    expect(screen.queryByTestId('live-terminal-stub')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start the minishell live terminal/i })).toBeInTheDocument();
  });

  it('mounts LiveTerminal only after first interaction with the terminal area', async () => {
    const user = userEvent.setup();
    render(await Home());
    await user.click(screen.getByRole('button', { name: /start the minishell live terminal/i }));
    expect(await screen.findByTestId('live-terminal-stub')).toBeInTheDocument();
  });
});

describe('homepage — has_demo gating (degradation, never a fake terminal)', () => {
  it('has_demo=false → quiet Demo offline plate + door to the project page', async () => {
    getProjectMock.mockResolvedValue(demoDetail(false));
    render(await Home());
    expect(screen.getByText('Demo offline')).toBeInTheDocument();
    const door = screen.getByRole('link', { name: /view the project instead/i });
    expect(door).toHaveAttribute('href', '/projects/minishell');
    // No dormant button, no live pane — nothing pretends to be a terminal.
    expect(screen.queryByRole('button', { name: /start the minishell/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-terminal-stub')).not.toBeInTheDocument();
  });

  it('hero fetch failure → same offline plate (API down ≠ blank page)', async () => {
    getProjectMock.mockRejectedValue(new Error('network down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(await Home());
    expect(screen.getByText('Demo offline')).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});

describe('homepage — featured work curation', () => {
  it('renders ONLY is_featured cards, not the full ledger', async () => {
    render(await Home());
    const featured = LEDGER.filter((p) => p.is_featured);
    for (const project of featured) {
      expect(screen.getByRole('link', { name: new RegExp(project.title, 'i') })).toHaveAttribute(
        'href',
        `/projects/${project.slug}`
      );
    }
    // Non-featured projects must NOT render on the homepage.
    expect(screen.queryByRole('link', { name: /philosophers/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /push.?swap/i })).not.toBeInTheDocument();
  });

  it('offers the door to the full index', async () => {
    render(await Home());
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/projects');
  });

  it('hides the work section entirely when the list fetch fails', async () => {
    getProjectsMock.mockRejectedValue(new Error('network down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(await Home());
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Selected work' })).not.toBeInTheDocument();
    });
    // The hero and doors still render — independent degradation.
    expect(screen.getByRole('heading', { name: 'Amine Aouichou' })).toBeInTheDocument();
    errorSpy.mockRestore();
  });
});

describe('homepage — one-line doors + SEO', () => {
  it('renders the Experience and About doors', async () => {
    render(await Home());
    expect(screen.getByRole('link', { name: /where i.{1,2}ve worked/i })).toHaveAttribute('href', '/experience');
    expect(screen.getByRole('link', { name: /who i am/i })).toHaveAttribute('href', '/about');
  });

  it('carries recruiter-facing metadata, zero oversell', () => {
    expect(metadata.title).toContain('Amine Aouichou');
    expect(metadata.description).toMatch(/full-stack engineer/i);
    expect(metadata.openGraph?.title).toContain('Amine Aouichou');
  });
});

describe('homepage — first-contact motion (brief §4.4)', () => {
  // The choreography is CSS (the ONLY keyframe block, §4.7). The contract
  // has two halves, both pinned: the DOM carries the fc-* classes, and the
  // stylesheet routes every fc-* duration through --motion-scale — the
  // dial prefers-reduced-motion zeroes. DOM under reduced motion is
  // IDENTICAL (that is the design: dial 0 = final state, no reflow).
  it('carries the fc-* choreography classes on the hero elements', async () => {
    render(await Home());
    expect(document.querySelector('.fc-name')).not.toBeNull();
    expect(document.querySelector('.fc-rule')).not.toBeNull();
    expect(document.querySelector('.fc-pane')).not.toBeNull();
    expect(document.querySelector('.fc-type')).not.toBeNull();
    // The choreography is homepage-only: no other element carries fc-*.
    expect(document.querySelectorAll('[class*="fc-"]').length).toBe(4);
  });

  it('CSS contract: fc-* animations scale with --motion-scale; reduced-motion zeroes the dial', async () => {
    render(await Home()); // page must render (fixture sanity) before the CSS pin
    const css = await import('node:fs').then((fs) =>
      fs.readFileSync(`${process.cwd()}/src/app/globals.css`, 'utf8')
    );
    // Every fc-* animation duration multiplies by the dial. Three
    // declarations cover four classes (.fc-name and .fc-pane share
    // fc-set — the set animation is the pane's rise).
    const fcAnimations = css.match(/animation: fc-\w+[^;]+/g) ?? [];
    expect(fcAnimations.length).toBe(3);
    for (const declaration of fcAnimations) {
      expect(declaration).toContain('var(--motion-scale)');
    }
    // The dial itself: prefers-reduced-motion reduce → 0 (brief §4.1).
    const reducedBlock = css.slice(
      css.indexOf('@media (prefers-reduced-motion: reduce)'),
      css.indexOf('}', css.indexOf('--motion-scale: 0'))
    );
    expect(reducedBlock).toContain('--motion-scale: 0');
  });
});
