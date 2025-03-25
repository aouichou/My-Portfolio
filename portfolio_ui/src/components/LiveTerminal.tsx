// portfolio_ui/src/components/LiveTerminal.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Function to handle error with auto-refresh
  const handleConnectionError = (message: string) => {
    setError(message);
    const term = terminalRef.current;
    
    if (term) {
      term.write(`\r\n\x1b[31mERROR: ${message}\x1b[0m\r\n`);
      term.write('\r\nPage will refresh automatically in 5 seconds...\r\n');
      term.write('Press any key to cancel auto-refresh.\r\n');
    }
    
    // Start countdown
    setRefreshCountdown(5);
    
    // Set up countdown timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          window.location.reload();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    refreshTimerRef.current = timer;
  };
  
  // Cancel auto-refresh
  const cancelAutoRefresh = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setRefreshCountdown(null);
    
    const term = terminalRef.current;
    if (term) {
      term.write('\r\nAuto-refresh cancelled. Please refresh the page manually if needed.\r\n');
    }
  };

  useEffect(() => {
    const terminalElement = document.getElementById('terminal');
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
    
    // Connect to WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    // If on the main domain, use the API subdomain
    if (host === 'aouichou.me' || host === 'www.aouichou.me') {
      host = 'api.aouichou.me';
    }
    
    const wsUrl = `${wsProtocol}//${host}/ws/terminal/${slug}/`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
      setConnected(true);
      term.write('Connected to terminal server...\r\n');
    };
    
    socket.onclose = (event) => {
      setConnected(false);
      if (event.code !== 1000) { // Not a clean close
        handleConnectionError('Connection closed unexpectedly');
      } else {
        term.write('\r\nConnection closed.\r\n');
      }
    };
    
    socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      handleConnectionError('Error connecting to terminal server');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.output) {
          term.write(data.output);
        }
      } catch (e) {
        console.error("Error processing message:", e);
        term.write(event.data);
      }
    };
    
    setTimeout(() => {
      term.focus();
    }, 1000);

    terminalRef.current = term;
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    
    const unicodeAddon = new Unicode11Addon();
    term.loadAddon(unicodeAddon);
    term.unicode.activeVersion = '11';

    // Define resize function
    const resizeTerminal = () => {
      setTimeout(() => {
        try {
          fitAddon.fit();
          
          if (connected && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              resize: { cols: term.cols, rows: term.rows }
            }));
          }
        } catch (e) {
          console.error("Fit error:", e);
        }
      }, 100);
    };
    
    // Open terminal in the container
    term.open(terminalElement);
    resizeTerminal();
    
    // Handle window resize events
    window.addEventListener('resize', resizeTerminal);
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        resizeTerminal();
      }
    });

    term.onData((data) => {
      // Cancel auto-refresh if user presses any key
      if (refreshCountdown !== null) {
        cancelAutoRefresh();
        return;
      }
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ 
          input: data
        }));
      }
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeTerminal);
      document.removeEventListener('visibilitychange', () => {});
      
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [slug]);
  
  return (
    <div className="terminal-wrapper relative h-full">
      <div id="terminal" className="absolute top-0 left-0 right-0 bottom-0" />
      {refreshCountdown !== null && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded shadow-lg text-sm animate-pulse">
		  Refreshing in {refreshCountdown}s...
		</div>
      )}
    </div>
  );
}