// portfolio_ui/src/components/LiveTerminal.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Project } from '@/library/types';

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
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#a0a0a0',
      }
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
	  console.log("Socket opened");
      setConnected(true);
      term.write('Connected to terminal server...\r\n');
    };
    
    socket.onclose = () => {
      setConnected(false);
      term.write('\r\nConnection closed. Please refresh to reconnect.\r\n');
    };
    
    socket.onerror = (event) => {
      setError('WebSocket error occurred');
      term.write('\r\nError connecting to terminal server.\r\n');
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.output) {
          term.write(data.output);
        }
      } catch (e) {
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
    
    term.open(terminalElement);
    fitAddon.fit();
    
    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      if (connected && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          resize: { cols: term.cols, rows: term.rows }
        }));
      }
    };
    
    window.addEventListener('resize', handleResize);

	// Handle user input (handle characters one by one):
	let currentCommand = '';

	term.onData((data) => {
	  console.log("Terminal received key:", data.charCodeAt(0));
	  
	  // ONLY check socket.readyState, NOT connected state
	  if (socket.readyState === WebSocket.OPEN) {
		// Handle Enter key properly (carriage return)
		if (data === '\r') {
		  // Send complete command with newline - ONCE
		  socket.send(JSON.stringify({ 
			command: currentCommand,
			execute: true  // Signal to execute the command
		  }));
		  currentCommand = '';
		} 
		// Handle backspace
		else if (data === '\u007f') {
		  // Backspace - remove last character
		  if (currentCommand.length > 0) {
			currentCommand = currentCommand.slice(0, -1);
			// Just send backspace character for handling by PTY
			socket.send(JSON.stringify({ command: data }));
		  }
		} 
		// Regular character input
		else {
		  // Add to command and send for echo
		  currentCommand += data;
		  socket.send(JSON.stringify({ command: data }));
		}
	  } else {
		console.log("Socket not ready:", socket.readyState);
	  }
	});;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
    };
  }, [slug]);
  
  return (
	<div className="flex flex-col h-full">
	  <button 
		className="bg-blue-600 text-white p-2 text-sm" 
		onClick={() => terminalRef.current?.focus()}
	  >
		Click here if you can't type
	  </button>
	  <div id="terminal" className="h-full" />
	</div>
  );
}