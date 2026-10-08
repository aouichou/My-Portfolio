/**
 * Behavioral tests — /contact page (F3-12), the conversion surface.
 *
 * Pins the page contract:
 * - editorial rhythm renders: overline, display h1, lede naming the three
 *   audiences (recruiters / clients / collaborators)
 * - the three fields + the plain-verb submit button ("Send message")
 * - labels are wired to inputs (a11y floor)
 * - the direct mailto fallback uses the site verb + the single source
 *   SITE_EMAIL (same action, same name as the footer)
 * - no placeholder noise, no placeholder attributes at all (paper form)
 */
import ContactPage from '@/app/contact/page';
import { SITE_EMAIL } from '@/components/site-nav';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);

function renderContact() {
  return render(<ContactPage />);
}

describe('/contact — the page frame', () => {
  it('renders the display h1 and the lede naming who should write', () => {
    renderContact();
    expect(screen.getByRole('heading', { level: 1, name: 'Write to me' })).toBeInTheDocument();
    expect(screen.getByText(/Recruiters with a role/i)).toBeInTheDocument();
    expect(screen.getByText(/clients with a project/i)).toBeInTheDocument();
    expect(screen.getByText(/collaborators with an idea/i)).toBeInTheDocument();
  });

  it('renders all three fields with wired labels', () => {
    renderContact();
    for (const label of ['Name', 'Email', 'Message']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('labels the submit button with the plain verb', () => {
    renderContact();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('offers the direct mailto under the site verb + single-source address', () => {
    renderContact();
    const mailto = screen.getByRole('link', { name: new RegExp(SITE_EMAIL, 'i') });
    expect(mailto).toHaveAttribute('href', `mailto:${SITE_EMAIL}`);
    expect(mailto.textContent).toContain('Email me');
  });

  it('renders no placeholder attributes (paper form — no ghost text)', () => {
    const { container } = renderContact();
    const withPlaceholder = container.querySelectorAll('[placeholder]');
    expect(withPlaceholder).toHaveLength(0);
  });
});
