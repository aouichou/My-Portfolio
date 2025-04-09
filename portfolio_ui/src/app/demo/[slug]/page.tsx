// src/app/demo/[slug]/page.tsx

'use client';

import { useParams } from 'next/navigation';
import { useProjectBySlug } from '@/library/queries';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import with SSR disabled
const LiveTerminal = dynamic(() => import('@/components/LiveTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p>Loading terminal...</p>
      </div>
    </div>
  ),
});

export default function ProjectDemoPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: project, isLoading } = useProjectBySlug(slug);
  
  if (isLoading || !project) {
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

	const commandsFromReadme = React.useMemo(() => {
	if (!project?.readme) return [];
	
	const commandRegex = /`([^`]+)`/g;
	const commands = [];
	let match;
	
	// Use exec in a loop instead of matchAll for better compatibility
	while ((match = commandRegex.exec(project.readme)) !== null) {
		if (match[1] && !match[1].includes('\n') && match[1].length < 30) {
		commands.push(match[1]);
		}
	}
	
	// Also look for code blocks (```sh commands ```)
	const codeBlockRegex = /```sh\s*([\s\S]*?)\s*```/g;
	while ((match = codeBlockRegex.exec(project.readme)) !== null) {
		if (match[1]) {
		// Split by lines and filter for command-like entries
		const lines = match[1].split('\n')
			.map(line => line.trim())
			.filter(line => 
			line.startsWith('./') || 
			line.startsWith('make') ||
			line.startsWith('git') ||
			line.startsWith('cd')
			);
		
		commands.push(...lines);
		}
	}
	
	return commands.slice(0, 8); // Limit to 8 commands
	}, [project?.readme]);
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center pl-16 pr-16" role="banner">
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
        {/* Terminal - Using LiveTerminal */}
        <div id="terminal-container" className="flex-1 overflow-hidden bg-black">
          <LiveTerminal project={project} slug={slug} />
        </div>
        
        {/* Documentation panel */}
        <div className="w-80 bg-gray-900 text-gray-200 p-4 overflow-y-auto hidden md:block">
          <h3 className="text-xl font-semibold mb-4">Command Reference</h3>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-blue-300">Project Commands</h4>
            <ul className="space-y-2 pl-4">
              {project?.demo_commands ? (
                Object.keys(project.demo_commands).map((cmd) => (
                  <li key={cmd}>
                    <code className="bg-gray-800 px-1 rounded">{cmd}</code>
                  </li>
                ))
              ) : commandsFromReadme.length > 0 ? (
                commandsFromReadme.map((cmd, i) => (
                  <li key={i}>
                    <code className="bg-gray-800 px-1 rounded">{cmd}</code>
                  </li>
                ))
              ) : (
                <>
                  <li><code className="bg-gray-800 px-1 rounded">ls</code> - List files</li>
                  <li><code className="bg-gray-800 px-1 rounded">cat README.md</code> - View README</li>
                  <li><code className="bg-gray-800 px-1 rounded">make</code> - Build project</li>
                  <li><code className="bg-gray-800 px-1 rounded">clear</code> - Clear terminal</li>
                </>
              )}
            </ul>
          </div>
		</div>
	  </div>
	</div>
  );
}