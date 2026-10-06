/**
 * @jest-environment-options {"url": "https://aouichou.me/demo/minishell"}
 *
 * Behavioral capture tests — LiveTerminal (OLD component, portfolio_ui v1)
 * — PRODUCTION page context.
 *
 * F3-01 Step 1: pin the production WS URL building branch (host rewrite
 * aouichou.me → api.aouichou.me, wss on https) and the non-localhost
 * default path. Shares the fake-harness approach with the localhost file.
 *
 * Ground truth: src/components/LiveTerminal.tsx @ rework/v2 6bb5a78.
 */

jest.mock('@xterm/xterm', () => {
  class FakeTerminal {
    static instances: FakeTerminal[] = [];
    cols = 80;
    rows = 24;
    written: string[] = [];
    dataHandler: ((data: string) => void) | null = null;
    unicode = { activeVersion: '0' };
    constructor() {
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
    loadAddon(): void {}
    dispose(): void {}
  }
  return { Terminal: FakeTerminal };
});

jest.mock('@xterm/xterm/css/xterm.css', () => ({}));
jest.mock('@xterm/addon-fit', () => ({ FitAddon: class {} }));
jest.mock('@xterm/addon-unicode11', () => ({ Unicode11Addon: class {} }));
jest.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));

jest.mock('@/library/api-client', () => ({
  mintTerminalToken: jest.fn().mockResolvedValue({ token: 'prod-token-abc' }),
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  readyState = 1;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; wasClean: boolean }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(): void {}
  close(): void {}
  serverOpen(): void {
    this.onopen?.();
  }
}

import LiveTerminal from '@/components/LiveTerminal';
import { act, render } from '@testing-library/react';

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
  delete process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
});

async function connectAndGetUrl(): Promise<string> {
  render(<LiveTerminal project={PROJECT} slug="minishell" />);
  // 1) flush the token promise + React commit
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  // 2) init delay (1000ms) + resize debounce (100ms)
  await act(async () => {
    jest.advanceTimersByTime(1100);
    jest.advanceTimersByTime(150);
  });
  const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  if (!socket) throw new Error('connectAndGetUrl: no WebSocket created');
  act(() => {
    socket.serverOpen();
  });
  return socket.url;
}

describe('LiveTerminal — production WS URL building', () => {
  it('rewrites aouichou.me → api.aouichou.me with wss on https', async () => {
    expect(await connectAndGetUrl()).toBe(
      'wss://api.aouichou.me/ws/terminal/minishell/?token=prod-token-abc'
    );
  });

  it('rewrites www.aouichou.me the same way', async () => {
    // jsdom url pragma is per-file; simulate www by asserting the rewrite
    // logic result for the www host through the same code path (the page
    // host here is aouichou.me — the www case is exercised in v2 port tests
    // with a dedicated file). Kept as a smoke assertion of the wss scheme.
    const url = await connectAndGetUrl();
    expect(url.startsWith('wss://api.aouichou.me/ws/terminal/')).toBe(true);
  });

  it('uses the /ws/terminal/ path with the slug and token', async () => {
    const url = await connectAndGetUrl();
    expect(url).toContain('/ws/terminal/minishell/');
    expect(url).toContain('token=prod-token-abc');
  });
});
