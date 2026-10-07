/**
 * Behavioral tests — ArchitectureDiagrams (F3-09b).
 *
 * Pins:
 * - mermaid sources render via the (mocked) mermaid lib, inside a Fig.
 *   plate with mono caption `Fig. N — {title}`
 * - description prose prints above the figure when present
 * - SSR-safe: pre-mount the slot is a quiet reserved box (no fake SVG)
 * - lazy: mermaid.render is NOT called until the figure is visible
 * - parse failure → quiet inline note, plate frame kept, no throw
 * - token skin: initialize() is called with theme 'base' + themeVariables
 *   carrying OUR tokens (never mermaid defaults — blacklist guard)
 * - custom URL diagrams render as <img> plates
 * - empty array → renders nothing
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import ArchitectureDiagrams from '@/components/projects/ArchitectureDiagrams';
import type { ArchitectureDiagram } from '@/library/types/api-v2';

afterEach(cleanup);

// jsdom lacks IntersectionObserver → the component renders eagerly;
// we still assert laziness by controlling visibility below.
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  static instances: MockIntersectionObserver[] = [];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

const renderMock = jest.fn();
const initializeMock = jest.fn();

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: (...args: unknown[]) => initializeMock(...args),
    render: (...args: unknown[]) =>
      renderMock(...(args as [string, string])) as Promise<{ svg: string }>,
  },
}));

function diagram(overrides: Partial<ArchitectureDiagram> = {}): ArchitectureDiagram {
  return {
    title: 'Architecture',
    type: 'mermaid',
    content: 'graph TD\n    A[Main] --> B[Worker]',
    description: '',
    ...overrides,
  };
}

beforeEach(() => {
  renderMock.mockReset();
  initializeMock.mockReset();
  renderMock.mockResolvedValue({ svg: '<svg>diagram</svg>' });
  MockIntersectionObserver.instances = [];
  // Tokens resolve in jsdom via the computed style fallbacks.
  window.getComputedStyle = jest.fn(() => ({
    getPropertyValue: (name: string) =>
      ({
        '--canvas': '#ffffff',
        '--surface': '#f6f5f4',
        '--ink': '#1a1a18',
        '--muted': '#6f6e6a',
        '--line': '#e5e4e0',
        '--accent': '#ad5700',
      })[name] ?? '',
  })) as unknown as typeof window.getComputedStyle;
});

describe('ArchitectureDiagrams — mermaid figures', () => {
  it('renders a mermaid source through the mermaid lib inside a Fig. plate', async () => {
    render(<ArchitectureDiagrams diagrams={[diagram()]} />);
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Architecture diagram' })).toBeInTheDocument()
    );
    expect(renderMock).toHaveBeenCalledWith(
      expect.stringContaining('Architecture'),
      'graph TD\n    A[Main] --> B[Worker]'
    );
    expect(screen.getByText('Fig. 1 — Architecture')).toBeInTheDocument();
  });

  it('numbers figures sequentially across diagrams', async () => {
    render(
      <ArchitectureDiagrams
        diagrams={[diagram(), diagram({ title: 'Data flow', type: 'custom', content: 'raw' })]}
      />
    );
    expect(screen.getByText('Fig. 1 — Architecture')).toBeInTheDocument();
    expect(screen.getByText('Fig. 2 — Data flow')).toBeInTheDocument();
  });

  it('prints description prose above the figure when present', async () => {
    render(
      <ArchitectureDiagrams
        diagrams={[diagram({ description: 'Threads and the monitor share the table.' })]}
      />
    );
    expect(screen.getByText('Threads and the monitor share the table.')).toBeInTheDocument();
  });

  it('initializes mermaid with the token skin — theme base + themeVariables', async () => {
    render(<ArchitectureDiagrams diagrams={[diagram()]} />);
    await waitFor(() => expect(initializeMock).toHaveBeenCalled());
    const config = initializeMock.mock.calls[0][0] as Record<string, unknown>;
    expect(config.theme).toBe('base');
    const vars = config.themeVariables as Record<string, string>;
    // OUR tokens, not mermaid defaults (blacklist: no blue/purple).
    expect(vars.background).toBe('#ffffff');
    expect(vars.lineColor).toBe('#1a1a18');
    expect(vars.mainBkg).toBe('#ad570014');
    expect(vars.nodeBorder).toBe('#1a1a18');
  });

  it('shows a quiet reserved box before mermaid lands (SSR-safe)', () => {
    render(<ArchitectureDiagrams diagrams={[diagram()]} />);
    // Placeholder state: the quiet label renders, the SVG does not.
    expect(screen.getByText('Architecture diagram')).toBeInTheDocument();
    expect(document.querySelector('.mermaid-figure')).toBeNull();
  });

  it('degrades to an inline note when the source fails to parse', async () => {
    renderMock.mockRejectedValue(new Error('parse error'));
    render(<ArchitectureDiagrams diagrams={[diagram()]} />);
    await waitFor(() =>
      expect(screen.getByText(/didn't parse/i)).toBeInTheDocument()
    );
    // The plate frame + caption survive.
    expect(screen.getByText('Fig. 1 — Architecture')).toBeInTheDocument();
  });

  it('renders a custom URL diagram as an image plate, not mermaid', async () => {
    render(
      <ArchitectureDiagrams
        diagrams={[
          diagram({
            type: 'custom',
            content: 'http://localhost:8000/media/diagrams/arch.png',
          }),
        ]}
      />
    );
    const img = screen.getByAltText('Architecture diagram');
    expect(img).toHaveAttribute('src', 'http://localhost:8000/media/diagrams/arch.png');
    expect(renderMock).not.toHaveBeenCalled();
    expect(screen.getByText('Fig. 1 — Architecture')).toBeInTheDocument();
  });

  it('renders a non-URL custom source as text in a plate (never markup)', () => {
    render(
      <ArchitectureDiagrams
        diagrams={[diagram({ type: 'custom', content: 'box -> box2' })]}
      />
    );
    expect(screen.getByText('box -> box2')).toBeInTheDocument();
  });

  it('renders nothing for an empty diagram list', () => {
    const { container } = render(<ArchitectureDiagrams diagrams={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ArchitectureDiagrams — laziness', () => {
  it('does not call mermaid.render until the figure intersects the viewport', async () => {
    const originalIO = window.IntersectionObserver;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).IntersectionObserver = MockIntersectionObserver;
    try {
      render(<ArchitectureDiagrams diagrams={[diagram()]} />);
      const observer = MockIntersectionObserver.instances[0];
      expect(observer).toBeDefined();
      // Not visible yet → no render call.
      expect(renderMock).not.toHaveBeenCalled();
      // Scroll into view → render fires.
      observer?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
      await waitFor(() => expect(renderMock).toHaveBeenCalled());
    } finally {
      window.IntersectionObserver = originalIO;
    }
  });
});
