/**
 * @jest-environment-options {"url": "http://localhost:3000/demo/minishell"}
 *
 * Behavioral capture tests — LiveTerminal (OLD component, portfolio_ui v1)
 * — LOCALHOST page context (the dev default).
 *
 * F3-01 Step 1: pin the testable surface of the terminal client:
 * - token mint call shape (/auth/terminal-token/)
 * - WS wire protocol ({input}/{resize}/{mfa_code} outbound; {output} and
 *   {action: 'require_mfa'} inbound) per the deployed terminal service
 * - localhost WS URL building (env override + default)
 * - connect-timeout + onclose/onerror mapping
 *
 * @xterm/* mocked with an instance-tracking fake; WebSocket replaced by a
 * capturing fake; api client mocked at module level.
 *
 * Ground truth: src/components/LiveTerminal.tsx @ rework/v2 6bb5a78.
 */

jest.mock('@xterm/xterm', () => {
  class FakeTerminal {
    static instances: FakeTerminal[] = [];
    cols = 80;
    rows = 24;
    options: Record<string, unknown>;
    disposed = false;
    written: string[] = [];
    loadedAddons: unknown[] = [];
    dataHandler: ((data: string) => void) | null = null;
    unicode = { activeVersion: '0' };
    constructor(options?: Record<string, unknown>) {
      this.options = options ?? {};
      FakeTerminal.instances.push(this);
    }
    open(): void {}
    write(data: string): void {
      this.written.push(data);
    }
    focus(): void {}
    onData(cb: (data: string) => void): void {
      this.dataHandler = cb;
    }
    loadAddon(addon: unknown): void {
      this.loadedAddons.push(addon);
    }
    dispose(): void {
      this.disposed = true;
    }
  }
  return { Terminal: FakeTerminal };
});

jest.mock('@xterm/xterm/css/xterm.css', () => ({}));

// F3-06a: fit() must exist as a no-op — resizeTerminal calls fitAddon.fit()
// before the send; a method-less mock class throws and masks the wire frame.
jest.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
jest.mock('@xterm/addon-unicode11', () => ({ Unicode11Addon: class {} }));
jest.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));

jest.mock('@/library/api-client', () => ({
  mintTerminalToken: jest.fn().mockResolvedValue({ token: 'test-token-123' }),
}));

// --- Capturing fake WebSocket -------------------------------------------

type Frame = Record<string, unknown>;

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  static instances: FakeWebSocket[] = [];
  static get last(): FakeWebSocket | undefined {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  url: string;
  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; wasClean: boolean }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  // Test helpers ---------------------------------------------------------
  serverOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(frame: Frame): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }

  receiveRaw(data: string): void {
    this.onmessage?.({ data });
  }

  sentFrames(): Frame[] {
    return this.sent.map((raw) => JSON.parse(raw) as Frame);
  }
}

import LiveTerminal from '@/components/LiveTerminal';
import { mintTerminalToken } from '@/library/api-client';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { terminalTheme } from '@/theme/terminal-theme';
import { act, render, waitFor } from '@testing-library/react';
import { Terminal } from '@xterm/xterm';

type FakeTerminalInstance = {
  written: string[];
  dataHandler: ((data: string) => void) | null;
  options: Record<string, unknown>;
  disposed: boolean;
};

const PROJECT = { slug: 'minishell', has_interactive_demo: true } as never;

beforeAll(() => {
  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    configurable: true,
    value: FakeWebSocket,
  });
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  FakeWebSocket.instances = [];
  (Terminal as unknown as { instances: unknown[] }).instances = [];
  jest.clearAllMocks();
  (mintTerminalToken as jest.Mock).mockResolvedValue({ token: 'test-token-123' });
  process.env.NEXT_PUBLIC_TERMINAL_WS_URL = 'ws://localhost:8001';
});

function terminalInstance(): FakeTerminalInstance {
  const instances = (Terminal as unknown as { instances: FakeTerminalInstance[] }).instances;
  const term = instances[instances.length - 1];
  if (!term) {
    throw new Error('terminalInstance: no Terminal was created');
  }
  return term;
}

function mount() {
  return render(<LiveTerminal project={PROJECT} slug="minishell" />);
}

async function advanceToConnected(): Promise<FakeWebSocket> {
  // 1) let the token promise resolve and React commit setAuthToken — flush
  // the microtask queue first WITHOUT advancing timers (state update must
  // land before the init timer fires).
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  // 2) run the component's 1000ms init delay + the 100ms resize debounce.
  await act(async () => {
    jest.advanceTimersByTime(1100);
    jest.advanceTimersByTime(150);
  });
  const socket: FakeWebSocket | undefined = FakeWebSocket.last;
  if (!socket) {
    throw new Error('advanceToConnected: no WebSocket was created');
  }
  // 3) server accepts the connection.
  act(() => {
    socket.serverOpen();
  });
  return socket;
}

describe('LiveTerminal — token mint', () => {
  it('fetches the guest token from /auth/terminal-token/ on mount', async () => {
    mount();
    await waitFor(() => expect(mintTerminalToken).toHaveBeenCalled());
  });

  it('does not open a socket before the token resolves', async () => {
    const release: (v: { token: string }) => void = await new Promise((resolve) => {
      (mintTerminalToken as jest.Mock).mockReturnValue(
        new Promise<{ token: string }>((innerResolve) => {
          resolve(innerResolve);
        })
      );
    });
    mount();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(FakeWebSocket.instances).toHaveLength(0);
    release?.({ token: 'late-token' });
  });
});

describe('LiveTerminal — WebSocket URL building (localhost page)', () => {
  it('uses NEXT_PUBLIC_TERMINAL_WS_URL when set', async () => {
    mount();
    await advanceToConnected();
    const sock = FakeWebSocket.last;
    if (!sock) throw new Error('no socket');
    expect(sock.url).toBe(
      'ws://localhost:8001/terminal/minishell/?token=test-token-123'
    );
  });

  it('defaults to ws://localhost:8001 when no env var is set', async () => {
    delete process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
    mount();
    await advanceToConnected();
    const sock = FakeWebSocket.last;
    if (!sock) throw new Error('no socket');
    expect(sock.url).toBe(
      'ws://localhost:8001/terminal/minishell/?token=test-token-123'
    );
  });

  it('embeds the minted token as a query param', async () => {
    (mintTerminalToken as jest.Mock).mockResolvedValue({ token: 'a-different-jwt' });
    mount();
    await advanceToConnected();
    const sock2 = FakeWebSocket.last;
    if (!sock2) throw new Error('no socket');
    expect(sock2.url).toContain('?token=a-different-jwt');
  });
});

describe('LiveTerminal — wire protocol', () => {
  it('sends {input: data} frames for terminal keystrokes', async () => {
    mount();
    const socket = await advanceToConnected();
    const term = terminalInstance();
    act(() => {
      term.dataHandler?.('ls\r');
    });
    expect(socket.sentFrames()).toContainEqual({ input: 'ls\r' });
  });

  it('sends {resize: {cols, rows}} frames on window resize (when dims changed)', async () => {
    mount();
    const socket = await advanceToConnected();
    // F3-06a FIX (was the captured stale-closure truth): resizeTerminal
    // no longer reads `connected` state (the handler registered at init
    // captured connected=false and NEVER sent post-connection). The send
    // now keys on socket.readyState === OPEN — so a resize after the
    // server accepts the connection emits the frame.
    const term = terminalInstance() as FakeTerminalInstance & { cols: number; rows: number };
    term.cols = 100;
    term.rows = 30;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    const resizeFrames = socket
      .sentFrames()
      .filter((f) => Object.prototype.hasOwnProperty.call(f, 'resize'));
    expect(resizeFrames).toContainEqual({ resize: { cols: 100, rows: 30 } });
  });

  it('does not send resize frames before the socket is open', async () => {
    mount();
    // Advance through init but do NOT serverOpen() — socket stays CONNECTING.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });
    const socket = FakeWebSocket.last;
    if (!socket) throw new Error('no socket');
    const term = terminalInstance() as FakeTerminalInstance & { cols: number; rows: number };
    term.cols = 120;
    term.rows = 40;
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    const resizeFrames = socket
      .sentFrames()
      .filter((f) => Object.prototype.hasOwnProperty.call(f, 'resize'));
    expect(resizeFrames).toHaveLength(0);
  });

  it('removes the visibilitychange listener on unmount (F3-06a leak fix)', async () => {
    const view = mount();
    await advanceToConnected();
    const spy = jest.spyOn(document, 'removeEventListener');
    view.unmount();
    expect(spy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );
    spy.mockRestore();
  });

  it('writes {output} frame payloads to the terminal', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => null);
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.receive({ output: 'hello from bash\r\n' });
    });
    expect(terminalInstance().written).toContain('hello from bash\r\n');
    promptSpy.mockRestore();
  });

  it('writes non-JSON inbound data directly to the terminal', async () => {
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.receiveRaw('plain stream');
    });
    expect(terminalInstance().written).toContain('plain stream');
  });

  it('prompts for MFA on {action: "require_mfa"} and sends {mfa_code}', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('123456');
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.receive({ action: 'require_mfa' });
    });
    expect(promptSpy).toHaveBeenCalledWith('Please enter your MFA code:');
    expect(socket.sentFrames()).toContainEqual({ mfa_code: '123456' });
    promptSpy.mockRestore();
  });

  it('sets an error state when the MFA prompt is dismissed (no frame sent)', async () => {
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null);
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.receive({ action: 'require_mfa' });
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/MFA verification required/);
    });
    expect(socket.sentFrames()).not.toContainEqual({ mfa_code: expect.anything() });
    promptSpy.mockRestore();
  });
});

describe('LiveTerminal — connection lifecycle', () => {
  it('closes the socket at the 15s connect timeout and reports it', async () => {
    mount();
    // Same sequencing as advanceToConnected, minus the server open.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
      jest.advanceTimersByTime(150);
    });
    const socket = FakeWebSocket.last;
    if (!socket) throw new Error('timeout test: no WebSocket created');
    expect(socket.readyState).toBe(FakeWebSocket.CONNECTING);
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });
    expect(socket.readyState).toBe(FakeWebSocket.CLOSED);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/timed out/i);
    });
  });

  it('maps close code 4003 to an authentication error', async () => {
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.onclose?.({ code: 4003, wasClean: true });
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Authentication failed/i);
    });
  });

  it('maps an unclean close to a connection-failed error', async () => {
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.onclose?.({ code: 1006, wasClean: false });
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Connection failed/i);
    });
  });

  it('maps a socket error to a WebSocket-failed error and stops loading', async () => {
    mount();
    const socket = await advanceToConnected();
    act(() => {
      socket.onerror?.({});
    });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/WebSocket connection failed/i);
    });
  });

  it('prints connect/connected progress lines to the terminal', async () => {
    mount();
    await advanceToConnected();
    const written = terminalInstance().written.join('');
    expect(written).toContain('Connecting to secure terminal...');
    expect(written).toContain('Connected to terminal server...');
  });
});

describe('LiveTerminal — token mint failure (v2 FIX: surfaces the error)', () => {
  it('rejects on mint failure → error state renders, no socket, loading stops', async () => {
    // v1 swallowed mint failures (fetchAuthToken returned null; the UI sat
    // on "Initializing secure terminal..." forever — dead error branch).
    // The Step-1 capture test in portfolio_ui pinned that old truth; this
    // v2 test pins the FIX: the rejection now reaches setError.
    (mintTerminalToken as jest.Mock).mockRejectedValue(new Error('mint failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mount();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(errorSpy).toHaveBeenCalledWith('Failed to fetch auth token:', expect.any(Error));
    expect(FakeWebSocket.instances).toHaveLength(0);
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Failed to authenticate/i);
    });
    expect(document.body.textContent).not.toContain('Initializing secure terminal');
    errorSpy.mockRestore();
  });
});

describe('LiveTerminal — theme application (F3-06b, brief §7.3)', () => {
  // The xterm theme must DERIVE from the design-system tokens via
  // terminalTheme(mode) — never a hardcoded palette. jsdom has no
  // stylesheet here, so terminalTheme resolves its §2.1 fallback pairs;
  // deep-equality against the function output is the point (wiring),
  // while the spot values pin the actual pair.
  function lastTerminal(): FakeTerminalInstance {
    const instances = (Terminal as unknown as { instances: FakeTerminalInstance[] }).instances;
    const term = instances[instances.length - 1];
    if (!term) throw new Error('no Terminal created');
    return term;
  }

  it('initializes xterm with the token-derived light theme (no hardcoded palette)', async () => {
    mount();
    await advanceToConnected();
    const term = lastTerminal();
    expect(term.options.theme).toEqual(terminalTheme('light'));
    // §2.1 light pair spot-check: paper terminal — canvas body, amber cursor.
    const theme = term.options.theme as Record<string, string>;
    expect(theme.background?.toLowerCase()).toBe('#ffffff');
    expect(theme.cursor?.toLowerCase()).toBe('#ad5700');
    // §7.3: the xterm font is the --font-mono stack (IBM Plex Mono first).
    expect(term.options.fontFamily).toContain('var(--font-plex-mono)');
    expect(String(term.options.fontFamily).indexOf('IBM')).toBe(-1); // var() indirection, not a hardcoded face
  });

  it('re-creates the terminal with the dark palette when the mode changes', async () => {
    // Mode-reactivity choice (documented in F3-06b report): teardown +
    // re-init on mode change — re-theming a live xterm loses already-
    // painted ANSI-mapped text; a fresh mount repaints cleanly.
    let setTheme: ((t: 'light' | 'dark') => void) | null = null;
    render(
      <ThemeProvider>
        <ProbeTheme onReady={(s) => { setTheme = s; }} />
        <LiveTerminal project={PROJECT} slug="minishell" />
      </ThemeProvider>
    );
    await advanceToConnected();
    const first = lastTerminal();
    expect((first.options.theme as Record<string, string>).background?.toLowerCase()).toBe('#ffffff');

    // Flip to dark → effect re-runs → old terminal disposed, new one dark.
    await act(async () => {
      (setTheme as unknown as (t: 'dark') => void)('dark');
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(1100);
      jest.advanceTimersByTime(150);
    });
    const instances = (Terminal as unknown as { instances: FakeTerminalInstance[] }).instances;
    expect(instances.length).toBeGreaterThanOrEqual(2);
    expect(first.disposed).toBe(true);
    const second = lastTerminal();
    expect(second).not.toBe(first);
    expect(second.options.theme).toEqual(terminalTheme('dark'));
    const dark = second.options.theme as Record<string, string>;
    expect(dark.background?.toLowerCase()).toBe('#161719'); // surface
    expect(dark.cursor?.toLowerCase()).toBe('#ffb224'); // dark amber
  });
});

/** Test helper: capture ThemeContext's setter so tests can flip modes. */
function ProbeTheme({ onReady }: { onReady: (set: (t: 'light' | 'dark') => void) => void }) {
  const { setTheme } = useTheme();
  onReady(setTheme);
  return null;
}
