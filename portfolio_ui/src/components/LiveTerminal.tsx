// portfolio_ui/src/components/LiveTerminal.tsx

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Project } from '@/library/types';
import { Unicode11Addon } from '@xterm/addon-unicode11';

interface LiveTerminalProps {
  project: Project;
  slug: string;
}

export default function LiveTerminal({ project, slug }: LiveTerminalProps) {
  const terminalRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    const terminalElement = document.getElementById('terminal-container');
    if (!terminalElement) return;
    
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
    
    // Add terminal addons
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    
    const unicodeAddon = new Unicode11Addon();
    term.loadAddon(unicodeAddon);
    term.unicode.activeVersion = '11';

    // Open terminal in the container
    term.open(terminalElement);
    
    // Attempt to connect with retries
    connectWebSocket(term, fitAddon);
    
    // Define resize function
    const resizeTerminal = () => {
      setTimeout(() => {
        try {
          fitAddon.fit();
          
          // Send the resize command to the server if connected
          if (socketRef.current && connected && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              resize: { cols: term.cols, rows: term.rows }
            }));
          }
        } catch (e) {
          console.error("Fit error:", e);
        }
      }, 100);
    };
    
    resizeTerminal();  // Initial fit
    
    // Handle window resize events
    window.addEventListener('resize', resizeTerminal);
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        resizeTerminal();
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeTerminal);
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [slug]);
  
  // WebSocket connection function with retry logic
  const connectWebSocket = (term: Terminal, fitAddon: FitAddon) => {
    if (connectionAttempts >= maxRetries) {
      term.write('\r\nMax connection attempts reached. Please reload the page.\r\n');
      setError('Failed to connect after multiple attempts');
      setIsLoading(false);
      return;
    }

    setConnectionAttempts(prev => prev + 1);
    
    // Show loading message
    term.write(`Connecting to terminal service (attempt ${connectionAttempts + 1}/${maxRetries})...\r\n`);
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let host = window.location.host;
    // If on the main domain, use the API subdomain
    if (host === 'aouichou.me' || host === 'www.aouichou.me') {
      host = 'api.aouichou.me';
    }
    
    const wsUrl = `${wsProtocol}//${host}/ws/terminal/${slug}/`;
    
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new connection
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    // Set 30-second timeout for connection
    const connectionTimeout = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close();
        term.write('\r\nConnection timeout. Retrying...\r\n');
        // Retry connection after delay
        setTimeout(() => connectWebSocket(term, fitAddon), 2000);
      }
    }, 30000);
    
    socket.onopen = () => {
      clearTimeout(connectionTimeout);
      setConnected(true);
      setIsLoading(false);
      term.write('Connected to terminal server!\r\n');
      term.focus();
      
      // Fit terminal and send size
      setTimeout(() => {
        fitAddon.fit();
        socket.send(JSON.stringify({
          resize: { cols: term.cols, rows: term.rows }
        }));
      }, 100);
      
      // Set up input handling
      term.onData((data) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ 
            input: data
          }));
        }
      });
    };
    
    socket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      setConnected(false);
      
      // Only show message if we were previously connected
      if (connected) {
        term.write('\r\nConnection closed. Attempting to reconnect...\r\n');
        // Try to reconnect after a short delay
        setTimeout(() => connectWebSocket(term, fitAddon), 2000);
      }
    };
    
    socket.onerror = (event) => {
      clearTimeout(connectionTimeout);
      console.error('WebSocket error:', event);
      setError('WebSocket error occurred');
      term.write('\r\nError connecting to terminal server. Retrying...\r\n');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.output) {
          term.write(data.output);
        }
        
        // Handle potential server error messages
        if (data.error) {
          setError(data.error);
          term.write(`\r\n\x1b[31mServer error: ${data.error}\x1b[0m\r\n`);
        }
        
        // Handle download progress updates
        if (data.download_progress) {
          const percent = data.download_progress.percent;
          term.write(`\r\nDownloading project files: ${percent}% complete`);
        }
      } catch (e) {
        // Raw data, just write it
        term.write(event.data);
      }
    };
  };
  
  return (
    <div className="terminal-wrapper relative h-full">
      <div className="absolute top-0 left-0 right-0 bottom-0" />
      
      {/* Error overlay */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg z-10">
          {error}
          <button 
            className="ml-2 font-bold"
            onClick={() => {
              setError(null);
              // Retry connection
              if (terminalRef.current) {
                setConnectionAttempts(0);
                connectWebSocket(terminalRef.current, new FitAddon());
              }
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}