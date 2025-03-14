// src/components/WasmTerminal.tsx  (maybe useful for other implementations)

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface WasmTerminalProps {
  projectSlug: string;
  commands: Record<string, string | (() => string)>;
  initialMessage?: string;
}

export default function WasmTerminal({ 
  projectSlug, 
  commands,
  initialMessage = "Welcome to the demo terminal!\nType 'help' to see available commands.\n\n"
}: WasmTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const [input, setInput] = useState<string>('');
  
  useEffect(() => {
    // Terminal setup
    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1E293B',
        foreground: '#F8FAFC',
        cursor: '#F8FAFC'
      },
      fontSize: 14
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
      terminalInstance.current = term;
      
      // Write initial message
      term.writeln(initialMessage);
      term.write(`${projectSlug}:~$ `);
      
      // Handle user input
      term.onKey(({ key, domEvent }) => {
        const ev = domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
        
        // Handle Enter
        if (ev.keyCode === 13) {
          term.writeln('');
          handleCommand(input);
          setInput('');
          term.write(`${projectSlug}:~$ `);
        }
        // Handle Backspace
        else if (ev.keyCode === 8) {
          if (input.length > 0) {
            term.write('\b \b');
            setInput(prev => prev.slice(0, -1));
          }
        } 
        // Regular character input
        else if (printable) {
          term.write(key);
          setInput(prev => prev + key);
        }
      });
      
      // Handle window resize
      const handleResize = () => fitAddon.fit();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
      };
    }
  }, [projectSlug, initialMessage]);
  
  // Command handler
  const handleCommand = (cmd: string) => {
    const term = terminalInstance.current;
    if (!term) return;
    
    const trimmedCmd = cmd.trim();
    
    if (trimmedCmd === 'help') {
      term.writeln('Available commands:');
      term.writeln('  help         Show this help message');
      term.writeln('  clear        Clear the terminal');
      Object.keys(commands).forEach(cmd => {
        term.writeln(`  ${cmd.padEnd(12)} Run ${cmd} command`);
      });
      return;
    }
    
    if (trimmedCmd === 'clear') {
      term.clear();
      return;
    }
    
    if (commands[trimmedCmd]) {
      const output = typeof commands[trimmedCmd] === 'function' 
        ? (commands[trimmedCmd] as Function)() 
        : commands[trimmedCmd];
      term.writeln(output);
    } else if (trimmedCmd) {
      term.writeln(`Command not found: ${trimmedCmd}. Type 'help' for available commands.`);
    }
  };
  
  return (
    <div className="bg-slate-800 rounded-lg p-2 overflow-hidden">
      <div className="flex items-center gap-2 p-2 border-b border-slate-700 mb-2">
        <div className="h-3 w-3 rounded-full bg-red-500"></div>
        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
        <div className="h-3 w-3 rounded-full bg-green-500"></div>
        <span className="text-sm text-slate-300 ml-2">{projectSlug} - Demo Terminal</span>
      </div>
      <div ref={terminalRef} className="h-72" />
    </div>
  );
}