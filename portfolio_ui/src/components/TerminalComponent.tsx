// portfolio_ui/src/components/TerminalComponent.tsx

'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Project } from '@/library/types';

interface TerminalComponentProps {
  project: Project;
  slug: string;
}

export default function TerminalComponent({ project, slug }: TerminalComponentProps) {
  const terminalRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) {
      const terminalElement = document.getElementById('terminal');
      if (!terminalElement) return;
      
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#a0a0a0',
          selectionBackground: 'rgba(128, 128, 128, 0.3)',
          selectionForeground: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5'
        }
      });
      
      terminalRef.current = term;
  
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(new WebLinksAddon());
      
      term.open(terminalElement);
      fitAddon.fit();
      
      // Write welcome message
      term.writeln(`Welcome to the interactive demo for ${project?.title || 'Project'}`);
      term.writeln(`Type "help" to see available commands.`);
      term.writeln('');
      term.write(`${slug}:~$ `);
  
      let input = '';
      let commandHistory: string[] = [];
      let historyIndex = commandHistory.length;
      
      term.onKey(({ key, domEvent }) => {
        const ev = domEvent;
        const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
        
        // Handle Enter
        if (ev.keyCode === 13) {
          term.writeln('');
          if (input.trim()) {
            commandHistory.push(input.trim());
            historyIndex = commandHistory.length;
            executeCommand(input.trim());
          }
          input = '';
          term.write(`${slug}:~$ `);
        }
        // Handle Backspace
        else if (ev.keyCode === 8) {
          if (input.length > 0) {
            input = input.substring(0, input.length - 1);
            term.write('\b \b');
          }
        }
        // Handle Up Arrow (history)
        else if (ev.keyCode === 38) {
          if (historyIndex > 0) {
            historyIndex--;
            input = commandHistory[historyIndex];
            // Clear current input line
            term.write('\r' + `${slug}:~$ ` + ' '.repeat(100) + '\r');
            term.write(`${slug}:~$ ` + input);
          }
        }
        // Handle Down Arrow (history)
        else if (ev.keyCode === 40) {
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            input = commandHistory[historyIndex];
            // Clear current input line
            term.write('\r' + `${slug}:~$ ` + ' '.repeat(100) + '\r');
            term.write(`${slug}:~$ ` + input);
          } else if (historyIndex === commandHistory.length - 1) {
            historyIndex = commandHistory.length;
            input = '';
            // Clear current input line
            term.write('\r' + `${slug}:~$ ` + ' '.repeat(100) + '\r');
            term.write(`${slug}:~$ `);
          }
        }
        // Handle printable characters
        else if (printable) {
          input += key;
          term.write(key);
        }
      });
      
      // Handle window resize
      const handleResize = () => {
        fitAddon?.fit();
      };
      window.addEventListener('resize', handleResize);
      
      // Return cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        if (terminalRef.current) {
          terminalRef.current.dispose();
        }
      };
    }
    
    // Define the executeCommand function
    function executeCommand(cmd: string) {
      const term = terminalRef.current;
      if (!term) return;
      
      // Project-specific commands from database
      const projectCommands = project?.demo_commands || {};
      
      // Define known long-running commands
      const longRunningCommands = ['make', './miniRT', 'gcc', 'npm', 'git clone', 'python', 'install'];
      
      // Check if this is a command that might take time
      const isLongRunning = 
        cmd === './miniRT scenes/basic_sphere.rt' || 
        longRunningCommands.some(longCmd => cmd.includes(longCmd));
      
      // Basic commands
      if (cmd === 'help') {
        term.writeln('Available commands:');
        term.writeln('  help         Show this help message');
        term.writeln('  clear        Clear the terminal');
        term.writeln('  ls           List files');
        term.writeln('  cat README   View README file');
        term.writeln('  run          Execute the project demo');
        
        // Show project-specific commands
        if (Object.keys(projectCommands).length > 0) {
          term.writeln('\nProject commands:');
          Object.keys(projectCommands).forEach(cmdKey => {
            const firstLine = typeof projectCommands[cmdKey] === 'string' 
              ? projectCommands[cmdKey].split('\n')[0] 
              : 'Command description';
            term.writeln(`  ${cmdKey.padEnd(12)} ${firstLine}`);
          });
        }
        return;
      }
      
      if (cmd === 'clear') {
        term.clear();
        return;
      }
      
      if (cmd === 'ls') {
        term.writeln('README.md');
        term.writeln('src/');
        term.writeln('Makefile');
        term.writeln('demo.sh');
        return;
      }
      
      if (cmd === 'cat README' || cmd === 'cat README.md') {
        term.writeln('# ' + (project?.title || 'Project'));
        term.writeln('');
        term.writeln(project?.description?.split('\n')[0] || 'No description available');
        term.writeln('');
        term.writeln('## How to run');
        term.writeln('Type `run` to execute the demo.');
        return;
      }
      
      if (cmd === 'run') {
        term.writeln('Running demo...');
        term.writeln('');
        
        // Simulate loading
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          term.write(`Loading: [${'.'.repeat(progress/10)}${' '.repeat(10-progress/10)}] ${progress}%\r`);
          
          if (progress >= 100) {
            clearInterval(interval);
            term.writeln('');
            term.writeln('Demo started successfully!');
            term.writeln('');
            term.writeln('This is a simulated environment showing how ' + (project?.title || 'this project') + ' works.');
            term.writeln('In a real implementation, you would see actual project output here.');
          }
        }, 200);
        return;
      }
      
      // Handle potentially long-running commands with an animation
      if (isLongRunning && projectCommands[cmd]) {
        term.writeln(`Running: ${cmd}`);
        
        // Show loading animation with ASCII spinner
        const loadingChars = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];
        let i = 0;
        const loadingInterval = setInterval(() => {
          term.write('\r' + loadingChars[i] + ' Processing...');
          i = (i + 1) % loadingChars.length;
        }, 100);
        
        // Simulate processing time (2 seconds)
        setTimeout(() => {
          clearInterval(loadingInterval);
          term.write('\r\n');
          
          // Show the actual output from projectCommands
          term.writeln(projectCommands[cmd]);
        }, 2000);
        
        return;
      }
      
      // Check project-specific commands (non long-running)
      if (projectCommands[cmd]) {
        term.writeln(projectCommands[cmd]);
        return;
      }
      
      term.writeln(`Command not found: ${cmd}`);
    }
  }, [project, slug]);
  
  return <div id="terminal" className="h-full"></div>;
}