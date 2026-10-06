/**
 * Behavioral capture tests — ThemeContext (OLD module, portfolio_ui v1)
 *
 * F3-01 Step 1: pin CURRENT behavior of the theme provider before porting.
 *
 * Ground truth: src/context/ThemeContext.tsx @ rework/v2 6bb5a78.
 */

import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { act, render, screen } from '@testing-library/react';

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="btn-dark" onClick={() => setTheme('dark')}>switch-dark</button>
      <button data-testid="btn-light" onClick={() => setTheme('light')}>switch-light</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>
  );
}

/** Media query list stub factory matching the jest.setup.js shape. */
function makeMatchMedia(matchesByQuery: Record<string, boolean>) {
  return (query: string): MediaQueryList =>
    ({
      matches: matchesByQuery[query] ?? false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }) as unknown as MediaQueryList;
}

let matchMediaSpy: jest.SpyInstance | null = null;

afterEach(() => {
  // Restore the setup.js stub shape (mockRestore would go back to jsdom's
  // original undefined matchMedia and break later tests in this file).
  if (matchMediaSpy) {
    matchMediaSpy.mockRestore();
    matchMediaSpy = null;
    window.matchMedia = makeMatchMedia({});
  }
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  window.matchMedia = makeMatchMedia({});
});

afterEach(() => {
  // Persisted theme from a previous test must not leak into the next one
  // (the mount effect reads localStorage on every renderProbe()).
  window.localStorage.clear();
});

describe('ThemeProvider — initial state', () => {
  it('defaults to light with no stored preference and no system preference', () => {
    // jest.setup.js matchMedia stub returns matches: false for everything.
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('reads the stored theme key on mount', () => {
    window.localStorage.setItem('theme', 'dark');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('falls back to the system preference when no stored theme exists', () => {
    // spyOn (not assignment) so the stub is restorable. mockRestore() would
    // resurrect jsdom's undefined matchMedia, so we restore the setup.js
    // stub SHAPE manually in afterEach instead (see restoreMatchMediaStub).
    matchMediaSpy = jest
      .spyOn(window, 'matchMedia')
      .mockImplementation(makeMatchMedia({ '(prefers-color-scheme: dark)': true }));
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });
});

describe('ThemeProvider — legacy key migration', () => {
  it('migrates darkMode=true → theme=dark and removes the old key', () => {
    window.localStorage.setItem('darkMode', 'true');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(window.localStorage.getItem('darkMode')).toBeNull();
  });

  it('migrates darkMode=false → theme=light and removes the old key', () => {
    window.localStorage.setItem('darkMode', 'false');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
    expect(window.localStorage.getItem('darkMode')).toBeNull();
  });

  it('legacy key WINS over an existing theme key (migration branch returns early)', () => {
    window.localStorage.setItem('theme', 'light');
    window.localStorage.setItem('darkMode', 'true');
    renderProbe();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});

describe('ThemeProvider — persistence and DOM application', () => {
  it('persists theme changes to localStorage', () => {
    renderProbe();
    act(() => {
      screen.getByTestId('btn-dark').click();
    });
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles the .dark class on documentElement', () => {
    renderProbe();
    act(() => {
      screen.getByTestId('btn-dark').click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    act(() => {
      screen.getByTestId('btn-light').click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('writes the initial theme to localStorage even before any toggle (effect runs on mount)', () => {
    renderProbe();
    // Second effect persists the current theme unconditionally on mount.
    expect(window.localStorage.getItem('theme')).toBe('light');
  });
});

describe('useTheme outside a provider', () => {
  it('returns the no-op default context (theme light, setTheme noop)', () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Probe />);
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(() => {
      act(() => {
        screen.getByTestId('btn-dark').click();
      });
    }).not.toThrow();
    // No provider effect → nothing persisted.
    expect(window.localStorage.getItem('theme')).toBeNull();
    consoleWarn.mockRestore();
  });
});
