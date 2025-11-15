// portfolio_ui/src/components/LiveTerminal.tsx

'use client';

import { api } from '@/library/api-client';
import { Project } from '@/library/types';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';

interface LiveTerminalProps {
  project: Project;
  slug: string;
}

// Function to get an auth token
async function fetchAuthToken() {
  try {
    const response = await api.get('/auth/terminal-token/');
    return response.data.token;
  } catch (error) {
    console.error('Failed to fetch auth token:', error);
    return null;
  }
}

export default function LiveTerminal({ project, slug }: LiveTerminalProps) {
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false); // Prevent double initialization
  const isMountedRef = useRef(true); // Track mount status
  
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);

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
    getToken();
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Terminal resize function
  const resizeTerminal = useCallback((term: Terminal | null, fitAddon: FitAddon | null, socket: WebSocket | null) => {
    if (!term || !fitAddon) return;
    
    setTimeout(() => {
      try {
        fitAddon.fit();
        
        if (connected && socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            resize: { cols: term.cols, rows: term.rows }
          }));
        }
      } catch (e) {
        console.error("Fit error:", e);
      }
    }, 100);
  }, [connected]);

  // Initialize terminal and WebSocket
  useEffect(() => {
    // Don't initialize until we have an auth token
    if (!authToken) {
      console.log('Waiting for auth token...');
      return;
    }

    // Prevent double initialization (React strict mode can cause this)
    if (isInitializingRef.current) {
      console.log('Already initializing, skipping...');
      return;
    }
    
    isInitializingRef.current = true;

    // Initialization delay to ensure DOM is ready and avoid race conditions
    const initTimer = setTimeout(() => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log('Component unmounted before initialization');
        return;
      }
      
      if (!containerRef.current) {
        if (isMountedRef.current) {
          setError("Terminal container not ready");
          setIsLoading(false);
        }
        isInitializingRef.current = false;
        return;
      }
      
      try {
        console.log('Initializing terminal with token:', authToken.substring(0, 20) + '...');
        
        // Initialize terminal with security settings
        const term = new Terminal({
          cursorStyle: 'block',
          cursorBlink: true,
          macOptionIsMeta: true,
          fontSize: 14,
          fontFamily: "'MesloLGS NF', 'Fira Code', 'Cascadia Code', monospace",
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#a0a0a0',
            cursorAccent: '#000000',
            selectionBackground: '#4d4d4d',
          },
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
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        let host = window.location.host;
        
        if (host === 'aouichou.me' || host === 'www.aouichou.me') {
          host = 'api.aouichou.me';
        }
        
        const wsUrl = `${wsProtocol}//${host}/ws/terminal/${slug}/?token=${authToken}`;
        
        console.log('🔌 WebSocket Configuration:');
        console.log('  - Protocol:', wsProtocol);
        console.log('  - Host:', host);
        console.log('  - Slug:', slug);
        console.log('  - Full URL:', wsUrl);
        console.log('  - Token present:', !!authToken);
        
        try {
          term.write('Connecting to secure terminal...\r\n');
          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;
          
          // Connection timeout - increased to 15 seconds for Render cold starts
          const connectionTimeout = setTimeout(() => {
            if (socket.readyState === WebSocket.CONNECTING) {
              console.error('❌ WebSocket connection timeout after 15s');
              console.error('  - ReadyState:', socket.readyState);
              socket.close();
              setError('Connection timed out - server may be starting up. Please try again.');
              setIsLoading(false);
            }
          }, 15000); // Increased from 5s to 15s
          
          // Socket event handlers
          socket.onopen = () => {
            console.log('✅ WebSocket connected successfully');
            clearTimeout(connectionTimeout);
            setConnected(true);
            setIsLoading(false);
            term.write('Connected to terminal server...\r\n');
            setTimeout(() => term.focus(), 500);
          };
          
          socket.onclose = (event) => {
            console.log('🔌 WebSocket closed');
            console.log('  - Code:', event.code);
            console.log('  - Reason:', event.reason);
            console.log('  - Clean:', event.wasClean);
            clearTimeout(connectionTimeout);
            setConnected(false);
            term.write('\r\nConnection closed. Please refresh to reconnect.\r\n');
            
            if (event.code === 4003) {
              setError('Authentication failed. Please refresh the page.');
            } else if (!event.wasClean) {
              setError(`Connection failed (code: ${event.code}). Please try again.`);
            }
          };
          
          socket.onerror = (event) => {
            console.error('❌ WebSocket error occurred');
            console.error('  - Event:', event);
            console.error('  - ReadyState:', socket.readyState);
            console.error('  - URL:', wsUrl);
            clearTimeout(connectionTimeout);
            setConnected(false);
            setIsLoading(false);
            setError('WebSocket connection failed - check browser console for details');
            term.write('\r\nError connecting to terminal server.\r\n');
          };
          
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.output) {
                term.write(data.output);
              }
              // Handle auth challenge if implemented
              if (data.action === 'require_mfa') {
                // Show MFA dialog to user
                promptForMFA(socket);
              }
            } catch (e) {
              // If not JSON, write directly
              term.write(event.data);
            }
          };
          
          // Input handling
          term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ 
                input: data
              }));
            }
          });
          
          // Set up resize handling
          const handleResize = () => resizeTerminal(term, fitAddon, socket);
          resizeHandlerRef.current = handleResize;
          
          window.addEventListener('resize', handleResize);
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              handleResize();
            }
          });
          
          // Initial terminal resize
          handleResize();
          
        } catch (e) {
          console.error("WebSocket initialization error:", e);
          setError(`Failed to connect: ${e instanceof Error ? e.message : String(e)}`);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Terminal initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize terminal");
        setIsLoading(false);
      }
    }, 1000); // Increased from 500ms to 1000ms for more stable initialization
    
    // Cleanup function
    return () => {
      clearTimeout(initTimer);
      isInitializingRef.current = false;
      
      // Clean up event listeners
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        document.removeEventListener('visibilitychange', resizeHandlerRef.current);
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
  }, [slug, authToken]); // Removed resizeTerminal from dependencies to prevent unnecessary re-renders
  
  // Function to prompt user for MFA code if needed
  const promptForMFA = (socket: WebSocket) => {
    const code = prompt("Please enter your MFA code:");
    if (code) {
      socket.send(JSON.stringify({ mfa_code: code }));
    } else {
      setError("MFA verification required");
    }
  };
  
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
              onClick={() => { window.location.reload(); }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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