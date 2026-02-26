// __tests__/unit/components/Hero.test.tsx
import { render, screen } from '@testing-library/react';

// Stub react-icons (not available in jest jsdom)
jest.mock('react-icons/hi', () => ({
  HiOutlineDocumentDownload: () => null,
}));

import Hero from '@/components/Hero';

describe('Hero component', () => {
  it('renders the main heading', () => {
    render(<Hero />);
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toBeInTheDocument();
  });

  it('contains "Full Stack Developer and DevOps Engineer" text', () => {
    render(<Hero />);
    expect(
      screen.getByText('Full Stack Developer and DevOps Engineer')
    ).toBeInTheDocument();
  });

  it('contains a resume download link', () => {
    render(<Hero />);
    const resumeLink = screen.getByRole('link', { name: /download resume/i });
    expect(resumeLink).toBeInTheDocument();
  });

  it('resume link points to /resume.pdf', () => {
    render(<Hero />);
    const resumeLink = screen.getByRole('link', { name: /download resume/i });
    expect(resumeLink).toHaveAttribute('href', '/resume.pdf');
  });

  it('resume link has download attribute', () => {
    render(<Hero />);
    const resumeLink = screen.getByRole('link', { name: /download resume/i });
    expect(resumeLink).toHaveAttribute('download');
  });
});
