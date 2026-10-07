/**
 * Behavioral tests — /about page (F3-11).
 *
 * Pins the recruiter-facing page contract:
 * - the name renders from the single source (site-nav SITE_OWNER)
 * - the mono facts block renders every served row (label + value)
 * - 42 Paris appears — 1337 NEVER (Batman content rule, pinned)
 * - the what-I-do list renders in full (plain verbs, real stacks)
 * - the contact door uses the site verb ("Email me") → /contact
 * - blacklist zero: no <img> (no photo), no progress/skill-bar elements
 *
 * The page is a static server component — no fetch to mock; render the
 * element directly.
 */

import AboutPage from '@/app/about/page';
import { SITE_OWNER } from '@/components/site-nav';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);

function renderAbout() {
  return render(<AboutPage />);
}

describe('/about — identity + facts', () => {
  it('renders the owner name as the h1 from the single source', () => {
    renderAbout();
    expect(screen.getByRole('heading', { level: 1, name: SITE_OWNER })).toBeInTheDocument();
  });

  it('renders the lede in the first person', () => {
    renderAbout();
    expect(screen.getByText(/I build software end to end/i)).toBeInTheDocument();
  });

  it('renders every facts-block row: label and value', () => {
    renderAbout();
    const pairs: Array<[string, RegExp]> = [
      ['Based in', /France/],
      ['Studying', /42 Paris — Expert in IT Architecture/],
      ['Internship', /Qynapse — Fullstack Engineer intern/],
    ];
    for (const [label, value] of pairs) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    // The name renders in BOTH the h1 and the facts row — by design.
    expect(screen.getAllByText(SITE_OWNER).length).toBeGreaterThanOrEqual(2);
  });

  it('states the school as 42 Paris — never 1337', () => {
    const { container } = renderAbout();
    expect(container.textContent).toContain('42 Paris');
    expect(container.textContent).not.toContain('1337');
  });
});

describe('/about — what I do + contact', () => {
  it('renders the what-I-do list in full', () => {
    renderAbout();
    expect(screen.getByText(/Systems programming in C and C\+\+/i)).toBeInTheDocument();
    expect(screen.getByText(/Fullstack web/i)).toBeInTheDocument();
    expect(screen.getByText(/AI integrations/i)).toBeInTheDocument();
    expect(screen.getByText(/Docker, Kubernetes/i)).toBeInTheDocument();
  });

  it('closes with the site contact verb linking to /contact', () => {
    renderAbout();
    const door = screen.getByRole('link', { name: 'Email me' });
    expect(door).toHaveAttribute('href', '/contact');
  });
});

describe('/about — blacklist zero (dispatch rules)', () => {
  it('renders no photo (no img element anywhere)', () => {
    const { container } = renderAbout();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders no skill bars or meters (no progress/meter elements)', () => {
    const { container } = renderAbout();
    expect(container.querySelector('progress')).toBeNull();
    expect(container.querySelector('meter')).toBeNull();
  });
});
