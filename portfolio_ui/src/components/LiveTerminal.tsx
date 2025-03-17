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

  useEffect(() => {
    const terminalElement = document.getElementById('terminal');
    if (!terminalElement) return;
    
    // Initialize terminal
	const term = new Terminal({
	  cursorStyle: 'block',
	  cursorBlink: true,
	  macOptionIsMeta: true,
	  fontSize: 14,
	  fontFamily: 'Consolas, monospace',
	  theme: {
	    background: '#1e1e1e',
	    foreground: '#d4d4d4',
	    cursor: '#a0a0a0',
	  },
	  disableStdin: false,
	  allowTransparency: true,
	  convertEol: true,  // Important: Convert line feeds
	  scrollback: 1000,
	  tabStopWidth: 4,
	  allowProposedApi: true,
	});
    
    // Connect to WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const wsUrl = `${wsProtocol}//api.aouichou.me/ws/terminal/${slug}/`;

	let host = window.location.host;
	// If on the main domain, use the API subdomain
	if (host === 'aouichou.me' || host === 'www.aouichou.me') {
	host = 'api.aouichou.me';
	}
	
	const wsUrl = `${wsProtocol}//${host}/ws/terminal/${slug}/`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    socket.onopen = () => {
	  console.log(`Socket opened at ${wsUrl}`);
      setConnected(true);
      term.write('Connected to terminal server...\r\n');
    };
    
    socket.onclose = (event) => {
	  console.log(`Socket closed with code: ${event.code}, reason: ${event.reason}`);
      setConnected(false);
      term.write('\r\nConnection closed. Please refresh to reconnect.\r\n');
    };
    
    socket.onerror = (event) => {
	  console.error('WebSocket error:', event);
      setError('WebSocket error occurred');
      term.write('\r\nError connecting to terminal server.\r\n');
    };
    
    socket.onmessage = (event) => {
	  console.log("Received message from server:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.output) {
		  console.log("Writing output to terminal:", data.output.substring(0, 30) + "...");
          term.write(data.output);
        }
      } catch (e) {
		console.error("Error processing message:", e);
        term.write(event.data);
      }
    };
    
	setTimeout(() => {
		term.focus();
		console.log("Terminal focused");
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
		// Short delay to ensure DOM layout is complete
		setTimeout(() => {
		try {
			fitAddon.fit();
			
			// Send the resize command to the server
			if (connected && socket.readyState === WebSocket.OPEN) {
			console.log(`Terminal resized to ${term.cols}x${term.rows}`);
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
	resizeTerminal();  // Initial fit
	
	// Handle window resize events
	window.addEventListener('resize', resizeTerminal);
	
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden) {
		  resizeTerminal();
		}
	  });

	term.onData((data) => {
		console.log("Terminal received key:", data.charCodeAt(0));
		
		if (socket.readyState === WebSocket.OPEN) {
		  // Simply send raw data to the server - don't try to track commands locally
		  socket.send(JSON.stringify({ 
			input: data  // Send raw character data
		  }));
		  if (data.charCodeAt(0) >= 32 || data === '\r' || data === '\n') {
			// term.write(data);
		  }
		} else {
		  console.log("Socket not ready:", socket.readyState);
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
  
  return (
	<div className="terminal-wrapper relative h-full">
		<div id="terminal" className="absolute top-0 left-0 right-0 bottom-0" />
	</div>
  );
}