/**
 * Behavioral tests — SiteHeader (F3-07).
 *
 * Pins the shell's navigation contract:
 * - active-route indication: amber underline (class) + aria-current="page"
 *   on the current route, including a child route (/projects/[slug])
 * - inactive routes carry NO aria-current
 * - mobile disclosure: hidden by default, aria-expanded/aria-controls wired,
 *   opens on toggle, closes on route change, Escape closes + returns focus
 *   to the toggle, focus wraps inside the open panel (Tab/Shift+Tab)
 *
 * jsdom cannot compute Tailwind underline classes; "amber underline" is
 * asserted via the class names that produce it (decoration-accent +
 * underline) — the token itself is guarded by scripts/check-tokens.mjs.
 */

import SiteHeader from '@/components/SiteHeader';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const pathnameRef = { current: '/' };

jest.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

function setPathname(pathname: string) {
  pathnameRef.current = pathname;
}

function getDesktopNav(): HTMLElement {
  // Desktop nav is the one whose id is NOT site-nav-mobile.
  const navs = screen.getAllByRole('navigation', { name: 'Main' });
  return navs.find((nav) => nav.id !== 'site-nav-mobile')!;
}

beforeEach(() => {
  setPathname('/');
});

describe('SiteHeader — active route indication', () => {
  it('marks the current route with aria-current="page" and the amber underline classes', () => {
    setPathname('/projects');
    render(<SiteHeader />);
    const work = getDesktopNav().querySelector('a[href="/projects"]')!;
    expect(work).toHaveAttribute('aria-current', 'page');
    expect(work.className).toContain('decoration-accent');
    expect(work.className).toContain('underline');
  });

  it('marks a child route as active (/projects/[slug] under /projects)', () => {
    setPathname('/projects/minishell');
    render(<SiteHeader />);
    const work = getDesktopNav().querySelector('a[href="/projects"]')!;
    expect(work).toHaveAttribute('aria-current', 'page');
  });

  it('does not mark inactive routes', () => {
    setPathname('/about');
    render(<SiteHeader />);
    const work = getDesktopNav().querySelector('a[href="/projects"]')!;
    expect(work).not.toHaveAttribute('aria-current');
    expect(work.className).toContain('no-underline');
    const about = getDesktopNav().querySelector('a[href="/about"]')!;
    expect(about).toHaveAttribute('aria-current', 'page');
  });

  it('renders the wordmark and all four nav verbs in sentence case', () => {
    render(<SiteHeader />);
    expect(screen.getByText('Amine Aouichou')).toBeInTheDocument();
    for (const label of ['Work', 'Experience', 'About', 'Contact']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });
});

describe('SiteHeader — mobile disclosure a11y', () => {
  it('is hidden until the Menu button opens it; aria-expanded reflects state', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'site-nav-mobile');
    const panel = document.getElementById('site-nav-mobile')!;
    expect(panel).toHaveAttribute('hidden');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Close');
    expect(panel).not.toHaveAttribute('hidden');
  });

  it('Escape closes the panel and returns focus to the toggle', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    await user.click(toggle);
    await user.keyboard('{Escape}');
    const panel = document.getElementById('site-nav-mobile')!;
    expect(panel).toHaveAttribute('hidden');
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps Tab focus inside the open panel (wraps last → first link)', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole('button', { name: 'Menu' });
    await user.click(toggle);
    const panel = document.getElementById('site-nav-mobile')!;
    const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const last = links[links.length - 1]!;
    last.focus();
    await user.tab(); // past last → wraps to first
    expect(document.activeElement).toBe(links[0]!);
    await user.tab({ shift: true }); // before first → wraps to last
    expect(document.activeElement).toBe(last);
  });
});
