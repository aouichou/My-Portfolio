// src/app/demo/[slug]/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useProjectBySlug } from '@/library/queries';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import Link from 'next/link';
import { Icons } from '@/components/Icons';

export default function ProjectDemoPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: project, isLoading: projectLoading } = useProjectBySlug(slug);
  const [terminalLoading, setTerminalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  
  useEffect(() => {
    if (!project || terminalRef.current) return; // Return if terminal already initialized
    
    // Terminal setup code
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
    
    setTerminalLoading(false);

    let input = '';
    let commandHistory: string[] = [];
    let historyIndex = commandHistory.length; // Index of the current command in history
    
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
    
	function executeCommand(cmd: string) {
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
	  
	  if (!project?.demo_commands || Object.keys(project.demo_commands).length === 0) {
		if (cmd !== 'help' && cmd !== 'clear' && cmd !== 'ls' && 
			cmd !== 'cat README' && cmd !== 'cat README.md' && cmd !== 'run') {
		  term.writeln('Demo commands are not configured for this project yet.');
		  return;
		}
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
    
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [project, slug]);
  
  if (projectLoading || terminalLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading project environment...</h2>
          <p className="text-gray-500 dark:text-gray-400">Setting up your interactive demo</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center" role="banner">
        <div className="flex items-center space-x-4">
          <Link 
            href={`/projects/${slug}`} 
            className="flex items-center space-x-2 hover:text-blue-300"
            aria-label="Back to project details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span>Back to Project</span>
          </Link>
          <span className="text-xl font-bold">{project?.title || 'Project'} Demo</span>
        </div>
        <div>
          <a 
            href={project?.code_url || '#'} 
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm"
          >
            View Source
          </a>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Terminal */}
        <div className="flex-1 overflow-hidden bg-black">
          <div id="terminal" className="h-full"></div>
        </div>
        
        {/* Documentation panel */}
        <div className="w-80 bg-gray-900 text-gray-200 p-4 overflow-y-auto hidden md:block">
          <h3 className="text-xl font-semibold mb-4">Command Reference</h3>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-blue-300">Available Commands</h4>
            <ul className="space-y-2 pl-4">
              <li><code className="bg-gray-800 px-1 rounded">ls</code> - List files</li>
              <li><code className="bg-gray-800 px-1 rounded">cat README</code> - View README file</li>
              <li><code className="bg-gray-800 px-1 rounded">run</code> - Execute project demo</li>
              <li><code className="bg-gray-800 px-1 rounded">clear</code> - Clear terminal</li>
              <li><code className="bg-gray-800 px-1 rounded">help</code> - Show all commands</li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-blue-300">Project Stack</h4>
            <div className="flex flex-wrap gap-2">
              {project?.tech_stack?.map((tech: string) => (
                <span key={tech} className="bg-gray-800 px-2 py-1 text-xs rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}