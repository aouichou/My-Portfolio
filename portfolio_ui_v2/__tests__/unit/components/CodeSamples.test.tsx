/**
 * Behavioral tests — CodeSamples / CodeSteps / DemoMount (F3-09b).
 *
 * Pins:
 * - snippets render title + language overline + description + code plate
 * - highlight runs through highlight.js core (mocked) for known languages
 * - unknown language → plain code, no highlight call, no throw
 * - Copy verb: quiet text `Copy` → `Copied` after clipboard write
 * - code_steps render as an ordered list with mono numbers 01/02/…
 * - DemoMount: commands as label + command rows + the Phase-4 mount box
 * - DemoMount: empty commands → nothing
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CodeSamples, CodeSteps, DemoMount } from '@/components/projects/CodeSamples';
import type { CodeSnippet, DemoCommand } from '@/library/types/api-v2';

afterEach(cleanup);

const highlightMock = jest.fn();
jest.mock('highlight.js/lib/core', () => ({
  __esModule: true,
  default: {
    getLanguage: jest.fn(() => null),
    registerLanguage: jest.fn(),
    highlight: (...args: unknown[]) => highlightMock(...(args as [string, object])),
  },
}));

// Grammar re-exports are shapeless stubs — registration is core's business.
jest.mock('highlight.js/lib/languages/c', () => ({ __esModule: true, default: {} }));
jest.mock('highlight.js/lib/languages/javascript', () => ({ __esModule: true, default: {} }));
jest.mock('highlight.js/lib/languages/python', () => ({ __esModule: true, default: {} }));

function snippet(overrides: Partial<CodeSnippet> = {}): CodeSnippet {
  return {
    title: 'Main Monitoring',
    description: 'Implementation of main monitoring',
    language: 'c',
    code: 'void *monitor(void *data) { return data; }',
    ...overrides,
  };
}

const writeTextMock = jest.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: writeTextMock },
  configurable: true,
});

beforeEach(() => {
  highlightMock.mockReset();
  highlightMock.mockReturnValue({ value: '<span class="hljs-keyword">void</span>' });
  writeTextMock.mockClear();
});

describe('CodeSamples', () => {
  it('renders title, language overline, description, and the code text', async () => {
    render(<CodeSamples snippets={[snippet()]} />);
    expect(screen.getByText('Main Monitoring')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('Implementation of main monitoring')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('void', { selector: '.hljs-keyword' })).toBeInTheDocument()
    );
  });

  it('highlights through highlight.js with the payload language', async () => {
    render(<CodeSamples snippets={[snippet()]} />);
    await waitFor(() => expect(highlightMock).toHaveBeenCalled());
    const [code, options] = highlightMock.mock.calls[0] as [string, { language: string }];
    expect(code).toContain('monitor');
    expect(options.language).toBe('c');
  });

  it('renders plain code for an unregistered language — no highlight, no throw', async () => {
    render(<CodeSamples snippets={[snippet({ language: 'haskell' })]} />);
    await waitFor(() =>
      expect(screen.getByText(/void \*monitor/)).toBeInTheDocument()
    );
    expect(highlightMock).not.toHaveBeenCalled();
  });

  it('prints the language overline as the raw tag', () => {
    render(<CodeSamples snippets={[snippet({ language: 'python' })]} />);
    expect(screen.getByText('python')).toBeInTheDocument();
  });

  it('falls back to a numbered title when absent', () => {
    render(<CodeSamples snippets={[snippet({ title: undefined })]} />);
    expect(screen.getByText('Snippet 1')).toBeInTheDocument();
  });

  it('Copy verb flips to Copied after writing the code to the clipboard', async () => {
    render(<CodeSamples snippets={[snippet()]} />);
    const copy = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copy);
    expect(writeTextMock).toHaveBeenCalledWith(snippet().code);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
  });

  it('renders nothing for an empty snippet list', () => {
    const { container } = render(<CodeSamples snippets={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CodeSteps', () => {
  it('renders ordered steps with mono ordinal numbers', () => {
    render(
      <CodeSteps
        steps={['Clone the repository', 'Run `make` to compile', 'Execute with parameters']}
      />
    );
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('03')).toBeInTheDocument();
    expect(screen.getByText('Clone the repository')).toBeInTheDocument();
  });

  it('renders nothing for zero steps', () => {
    const { container } = render(<CodeSteps steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DemoMount', () => {
  const commands: DemoCommand[] = [
    { label: 'Run', command: './philo 5 800 200 200' },
    { label: 'Compile', command: 'make' },
  ];

  it('renders each demo command as a label + command row', () => {
    render(<DemoMount commands={commands} />);
    expect(screen.getByText('Run')).toBeInTheDocument();
    expect(screen.getByText('./philo 5 800 200 200')).toBeInTheDocument();
    expect(screen.getByText('Compile')).toBeInTheDocument();
    expect(screen.getByText('make')).toBeInTheDocument();
  });

  it('reserves the Phase-4 LiveTerminal mount box (labeled, not a fake terminal)', () => {
    render(<DemoMount commands={commands} />);
    expect(screen.getByText(/Live terminal arrives with the demo system/i)).toBeInTheDocument();
  });

  it('renders nothing when there are no commands', () => {
    const { container } = render(<DemoMount commands={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
