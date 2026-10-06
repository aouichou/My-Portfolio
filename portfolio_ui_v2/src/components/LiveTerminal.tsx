/**
 * LiveTerminal — v2 port (F3-01).
 *
 * Ported from portfolio_ui/src/components/LiveTerminal.tsx @ rework/v2
 * 6bb5a78. Wire protocol UNCHANGED (frozen by the deployed terminal
 * service): outbound {input}/{resize}/{mfa_code} frames, inbound
 * {output}/{action: 'require_mfa'} — the capture suite pins every frame.
 *
 * Changes vs v1 (each pinned or noted in the capture suite):
 *  - token mint now uses the TYPED contract client (mintTerminalToken,
 *    contract §3.7) instead of a raw api.get
 *  - FIX (Step-1-suite-proven bug): v1's fetchAuthToken swallowed mint
 *    failures and returned null, leaving the UI on "Initializing secure
 *    terminal..." forever (dead error branch). v2 REJECTS on failure so
 *    the existing error state renders. Proof: the capture test
 *    "returns null from fetchAuthToken on mint failure → … loading state
 *    persists" pins the OLD behavior; the ported test asserts the fix.
 *  - FIX (F3-06a, handed off from F3-01): the resize stale closure —
 *    v1's resizeTerminal was useCallback([connected]); the handler
 *    registered at init captured connected=false, so NO resize frame was
 *    ever sent post-connection (capture suite pinned 0 frames). The fix
 *    drops the redundant `connected` state read and keys the send on
 *    socket.readyState === OPEN (the condition `connected &&` was meant to
 *    approximate). Wire protocol UNCHANGED: {resize:{cols,rows}} frames,
 *    only while the socket is open — now actually true. The visibilitychange
 *    listener also gets a stored ref so cleanup removes it (v1 leaked it:
 *    removeEventListener was passed the resize handler, not the anonymous
 *    visibility closure).
 */

'use client';

import { mintTerminalToken } from '@/library/api-client';
import type { ProjectDetail } from '@/library/types/api-v2';
import { useTheme } from '@/theme/ThemeContext';
import { terminalTheme } from '@/theme/terminal-theme';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';

interface LiveTerminalProps {
  project: Pick<ProjectDetail, 'slug' | 'has_demo'>;
  slug: string;
}

// Function to get an auth token — v2 FIX: throws on failure (v1 returned
// null and the component sat on the loading screen forever).
async function fetchAuthToken(): Promise<string> {
  try {
    const { token } = await mintTerminalToken();
    return token;
  } catch (error) {
    console.error('Failed to fetch auth token:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export default function LiveTerminal({ project, slug }: LiveTerminalProps) {
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false); // Prevent double initialization
  const isMountedRef = useRef(true); // Track mount status

  // F3-06a: the `connected` STATE is gone from the resize path (stale
  // closure source); the setter stays — the connection-status UI still
  // derives from it.
  const [, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // F3-06b (brief §7.3): the terminal's colors derive from the SAME
  // tokens as the site. The mode comes from ThemeContext; terminalTheme()
  // reads the live CSS custom props (with §2.1 fallbacks for jsdom/SSR).
  const { theme } = useTheme();

  // Fetch auth token when component mounts
  useEffect(() => {
    isMountedRef.current = true;

    async function getToken() {
      try {
        const token = await fetchAuthToken();
        if (isMountedRef.current) {
          setAuthToken(token);
        }
      } catch (err) {
        console.error('Failed to fetch auth token:', err);
        if (isMountedRef.current) {
          setError('Failed to authenticate. Please refresh the page.');
          setIsLoading(false);
        }
      }
    }
    void getToken();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Terminal resize function
  // F3-06a FIX: no `connected` state read (stale-closure source) — the
  // socket's own readyState is the authoritative send condition.
  const resizeTerminal = useCallback(
    (term: Terminal | null, fitAddon: FitAddon | null, socket: WebSocket | null) => {
      if (!term || !fitAddon) return;

      setTimeout(() => {
        try {
          fitAddon.fit();

          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                resize: { cols: term.cols, rows: term.rows },
              })
            );
          }
        } catch (e) {
          console.error('Fit error:', e);
        }
      }, 100);
    },
    []
  );

  // Function to prompt user for MFA code if needed
  // F3-06a: hoisted above the init effect — eslint v16's TDZ rule flagged
  // the old position (referenced at line ~274 before declaration).
  const promptForMFA = (socket: WebSocket) => {
    const code = prompt('Please enter your MFA code:');
    if (code) {
      socket.send(JSON.stringify({ mfa_code: code }));
    } else {
      setError('MFA verification required');
    }
  };

  // Initialize terminal and WebSocket
  useEffect(() => {
    // Don't initialize until we have an auth token
    if (!authToken) {
      return;
    }

    // Prevent double initialization (React strict mode can cause this)
    if (isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    // Initialization delay to ensure DOM is ready and avoid race conditions
    const initTimer = setTimeout(() => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      if (!containerRef.current) {
        setError('Terminal container not ready');
        setIsLoading(false);
        isInitializingRef.current = false;
        return;
      }

      try {
        // Initialize terminal with security settings
        // F3-06b (§7.3): theme comes from terminalTheme(theme) — tokens,
        // not a hardcoded palette. The theme key in deps re-runs this
        // effect ONLY on mode change: teardown + re-init is the chosen
        // strategy (see the F3-06b report) because xterm re-theming a
        // LIVE session via term.options.theme loses ANSI-mapped text
        // already painted by the PTY; a fresh mount repaints cleanly.
        // Font per §7.3: --font-mono stack (IBM Plex Mono), MesloLGS NF
        // kept as glyph fallback for the prompt theme.
        const term = new Terminal({
          cursorStyle: 'block',
          cursorBlink: true,
          macOptionIsMeta: true,
          fontSize: 14,
          fontFamily:
            "var(--font-plex-mono), 'MesloLGS NF', ui-monospace, 'SF Mono', Menlo, monospace",
          theme: terminalTheme(theme),
          disableStdin: false,
          allowTransparency: true,
          convertEol: true,
          scrollback: 1000,
          tabStopWidth: 4,
          allowProposedApi: true,
          fontWeightBold: 'bold',
        });
        terminalRef.current = term;

        // Initialize Add-ons
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;

        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        const unicodeAddon = new Unicode11Addon();
        term.loadAddon(unicodeAddon);
        term.unicode.activeVersion = '11';

        // Open terminal in the container
        term.open(containerRef.current);

        // Connect to secure WebSocket with token authentication
        // Detect localhost and use terminal service URL
        const isLocalhost =
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1';

        let wsUrl: string;
        if (isLocalhost) {
          const terminalWsUrl = process.env.NEXT_PUBLIC_TERMINAL_WS_URL || 'ws://localhost:8001';
          wsUrl = `${terminalWsUrl}/terminal/${slug}/?token=${authToken}`;
        } else {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          let host = window.location.host;

          if (host === 'aouichou.me' || host === 'www.aouichou.me') {
            host = 'api.aouichou.me';
          }

          wsUrl = `${wsProtocol}//${host}/ws/terminal/${slug}/?token=${authToken}`;
        }

        try {
          term.write('Connecting to secure terminal...\r\n');
          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;

          // Connection timeout - 15 seconds for Render cold starts
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState === WebSocket.CONNECTING) {
              socket.close();
              setError('Connection timed out - server may be starting up. Please try again.');
              setIsLoading(false);
            }
          }, 15000);

          socket.onopen = () => {
            clearTimeout(connectionTimeout);
            setConnected(true);
            setIsLoading(false);
            term.write('Connected to terminal server...\r\n');
            setTimeout(() => term.focus(), 500);
          };

          socket.onclose = (event) => {
            clearTimeout(connectionTimeout);
            setConnected(false);
            term.write('\r\nConnection closed. Please refresh to reconnect.\r\n');

            if (event.code === 4003) {
              setError('Authentication failed. Please refresh the page.');
            } else if (!event.wasClean) {
              setError(`Connection failed (code: ${event.code}). Please try again.`);
            }
          };

          socket.onerror = () => {
            console.error('WebSocket error occurred:', {
              readyState: socket.readyState,
              url: wsUrl,
            });
            clearTimeout(connectionTimeout);
            setConnected(false);
            setIsLoading(false);
            setError('WebSocket connection failed - check browser console for details');
            term.write('\r\nError connecting to terminal server.\r\n');
          };

          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data) as {
                output?: string;
                action?: string;
              };
              if (data.output) {
                term.write(data.output);
              }
              // Handle auth challenge if implemented
              if (data.action === 'require_mfa') {
                // Show MFA dialog to user
                promptForMFA(socket);
              }
            } catch {
              // If not JSON, write directly
              term.write(event.data);
            }
          };

          // Input handling
          term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  input: data,
                })
              );
            }
          });

          // Set up resize handling
          const handleResize = () => {
            resizeTerminal(term, fitAddon, socket);
          };
          resizeHandlerRef.current = handleResize;

          // F3-06a: named + stored — v1 registered an anonymous closure and
          // then removed a DIFFERENT function (the resize handler), leaking
          // the visibility listener on unmount.
          const handleVisibilityChange = () => {
            if (!document.hidden) {
              handleResize();
            }
          };
          visibilityHandlerRef.current = handleVisibilityChange;

          window.addEventListener('resize', handleResize);
          document.addEventListener('visibilitychange', handleVisibilityChange);

          // Initial terminal resize
          handleResize();
        } catch (e) {
          console.error('WebSocket initialization error:', e);
          setError(`Failed to connect: ${e instanceof Error ? e.message : String(e)}`);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Terminal initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize terminal');
        setIsLoading(false);
      }
    }, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimer);
      isInitializingRef.current = false;

      // Clean up event listeners
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }

      // Clean up socket
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Clean up terminal
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- v1 parity: resizeTerminal deliberately excluded to prevent the effect re-running (and tearing down the socket) when `connected` flips its identity. Capture suite depends on this lifecycle. `theme` IS a real dep (F3-06b): mode change must re-init with the new token-derived palette.
  }, [slug, authToken, theme]);

  void project; // project fields arrive with the page; slug keys the session

  return (
    <div className="terminal-wrapper relative h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
          <div className="text-white text-center p-6">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
            <p>Initializing secure terminal...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
          <div className="bg-red-900/80 text-white p-6 rounded-lg max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Terminal Error</h3>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="px-6 py-2 bg-white text-red-900 rounded hover:bg-gray-200 transition-colors"
            >
              Reload Terminal
            </button>
          </div>
        </div>
      )}

      <div ref={containerRef} className="absolute top-0 left-0 right-0 bottom-0" />
    </div>
  );
}
