/**
 * Behavioral tests — InternshipFacts (F3-09b).
 *
 * Pins the rescued internship-rich content rendering:
 * - stats as quiet mono-labeled rows (label + value)
 * - impact metrics with values and optional descriptions
 * - documentation list with titles + descriptions
 * - all-empty → renders nothing
 */

import InternshipFacts from '@/components/projects/InternshipFacts';
import type { DocRef, ImpactMetric, Stat } from '@/library/types/api-v2';
import { cleanup, render, screen } from '@testing-library/react';

afterEach(cleanup);

const stats: Stat[] = [
  { label: 'Coverage', value: '85%' },
  { label: 'Endpoints', value: '15+' },
  { label: 'Ownership', value: '90% backend + 3 frontend modules' },
];

const metrics: ImpactMetric[] = [
  { label: 'Reusability Score', value: '85%' },
  { label: 'Security Vulnerabilities Prevented', value: '15+' },
];

const docs: DocRef[] = [
  { title: 'QA Internship Report', description: 'End-of-internship deliverable' },
];

describe('InternshipFacts', () => {
  it('renders stats as label + value fact rows', () => {
    render(<InternshipFacts stats={stats} impactMetrics={[]} documentation={[]} />);
    expect(screen.getByText('Facts')).toBeInTheDocument();
    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Ownership')).toBeInTheDocument();
    expect(screen.getByText('90% backend + 3 frontend modules')).toBeInTheDocument();
  });

  it('renders impact metrics as their own quiet group', () => {
    render(<InternshipFacts stats={[]} impactMetrics={metrics} documentation={[]} />);
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Reusability Score')).toBeInTheDocument();
    expect(screen.getByText('15+')).toBeInTheDocument();
    expect(screen.queryByText('Facts')).not.toBeInTheDocument();
  });

  it('renders documentation as a list with descriptions', () => {
    render(<InternshipFacts stats={[]} impactMetrics={[]} documentation={docs} />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('QA Internship Report')).toBeInTheDocument();
    expect(screen.getByText('End-of-internship deliverable')).toBeInTheDocument();
  });

  it('renders all groups together when all are present', () => {
    render(<InternshipFacts stats={stats} impactMetrics={metrics} documentation={docs} />);
    expect(screen.getByText('Facts')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders nothing when every array is empty', () => {
    const { container } = render(
      <InternshipFacts stats={[]} impactMetrics={[]} documentation={[]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
