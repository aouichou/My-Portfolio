// src/app/demo/[slug]/page.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useProjectBySlug } from '@/library/queries';
import Link from 'next/link';
import { Icons } from '@/components/Icons';
import dynamic from 'next/dynamic';

// Dynamic import for XTerm components (client-side only)
const TerminalComponent = dynamic(() => import('@/components/TerminalComponent'), {
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
  const { data: project, isLoading: projectLoading } = useProjectBySlug(slug);
  const [error, setError] = useState<string | null>(null);
  
  if (projectLoading || !project) {
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
        {/* Terminal - Now loaded dynamically with next/dynamic */}
        <div className="flex-1 overflow-hidden bg-black">
          <TerminalComponent project={project} slug={slug} />
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