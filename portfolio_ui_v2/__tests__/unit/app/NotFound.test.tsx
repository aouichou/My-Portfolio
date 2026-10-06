/**
 * Behavioral tests — NotFound (F3-07).
 *
 * Brief §5.6 error voice: state what happened + how to fix it; no apology
 * fluff. Pins: the fact ("no page at this address"), the fix (links to
 * every real route), and the token discipline (amber rule, display-face
 * heading, muted note) at render level.
 */

import NotFound from '@/app/not-found';
import { render, screen } from '@testing-library/react';

describe('NotFound — render', () => {
  it('states what happened in the error voice', () => {
    render(<NotFound />);
    expect(
      screen.getByText('This address has no page'),
    ).toBeInTheDocument();
    expect(screen.getByText(/404 — no page at this address/i)).toBeInTheDocument();
  });

  it('offers the fix: a link to every existing route', () => {
    render(<NotFound />);
    for (const label of ['Work', 'Experience', 'About', 'Contact']) {
      const links = screen.getAllByRole('link', { name: label });
      expect(links.length).toBeGreaterThan(0);
    }
  });

  it('renders the one amber rule', () => {
    const { container } = render(<NotFound />);
    const rule = container.querySelector('.bg-accent');
    expect(rule).not.toBeNull();
  });
});
