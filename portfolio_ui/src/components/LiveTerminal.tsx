// portfolio_ui/src/components/LiveTerminal.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import { Project } from '@/library/types';

interface LiveTerminalProps {
  project: Project;
  slug: string;
}

export default function LiveTerminal({ project, slug }: LiveTerminalProps) {
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Define resize function outside useEffect for clarity
  const resizeTerminal = (term: Terminal | null, fitAddon: FitAddon | null, socket: WebSocket | null) => {
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
  };

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      if (!containerRef.current) {
        setError("Terminal container not ready");
        setIsLoading(false);
        return;
      }
      
      try {
        // Initialize terminal
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

        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon());

        const unicodeAddon = new Unicode11Addon();
        term.loadAddon(unicodeAddon);
        term.unicode.activeVersion = '11';

        // Open terminal in the container
        term.open(containerRef.current);

        // Initialize WebSocket connection
        initializeWebSocket(term, fitAddon);

        // Create a single resize handler and store reference
        const handleResize = () => resizeTerminal(term, fitAddon, socketRef.current);
        resizeHandlerRef.current = handleResize;
        
        // Add resize listeners
        window.addEventListener('resize', handleResize);
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            handleResize();
          }
        });

        // Initial resize
        handleResize();

        setIsLoading(false);
      } catch (err) {
        console.error("Terminal initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize terminal");
        setIsLoading(false);
      }
    }, 500); // 500ms delay to ensure DOM is ready
  
    return () => {
      clearTimeout(initTimer);
      
      // Clean up event listeners
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
      
      // Clean up socket
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      // Clean up terminal
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [slug, connected]);

  const initializeWebSocket = (term: Terminal, fitAddon: FitAddon) => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let host = window.location.host;
    if (host === 'aouichou.me' || host === 'www.aouichou.me') {
      host = 'api.aouichou.me';
    }
    
    const wsUrl = `${wsProtocol}//api.aouichou.me/ws/terminal/${slug}/`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
    
      const connectionTimeout = setTimeout(() => {
        if (socket.readyState === WebSocket.CONNECTING) {
          socket.close();
          setError('Connection timed out - please refresh');
          setIsLoading(false);
        }
      }, 5000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        setConnected(true);
        term.write('Connected to terminal server...\r\n');
        setTimeout(() => term.focus(), 500);
      };
    
      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setConnected(false);
        term.write('\r\nConnection closed. Please refresh to reconnect.\r\n');
      };
    
      socket.onerror = (event) => {
        clearTimeout(connectionTimeout);
        setConnected(false);
        console.error('WebSocket error:', event);
        setError('WebSocket error occurred - please try again');
        term.write('\r\nError connecting to terminal server.\r\n');
      };
    
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.output) {
            term.write(data.output);
          }
        } catch (e) {
          // If not JSON, write directly
          term.write(event.data);
        }
      };
    
      term.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ input: data }));
        }
      });
    } catch (e) {
      console.error("WebSocket initialization error:", e);
      setError(`Failed to connect: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="terminal-wrapper relative h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-10">
          <div className="text-white text-center p-6">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
            <p>Initializing terminal...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
          <div className="bg-red-900/80 text-white p-6 rounded-lg max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Terminal Error</h3>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
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