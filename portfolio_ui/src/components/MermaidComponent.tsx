// components/MermaidComponent.tsx

'use client';

import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

interface MermaidProps {
  chart: string;
}

export const MermaidComponent = ({ chart }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    // Define rendering function
    const renderDiagram = async () => {
      if (!containerRef.current) return;
  
	try {
		// Wait for mermaid to be initialized
		let retries = 0;
		while (!mermaid.initialize && retries < 5) {
		  await new Promise(resolve => setTimeout(resolve, 200));
		  retries++;
		}
	
      try {
        // Clean any previous content
        containerRef.current.innerHTML = '';
        
        // Create a unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Create diagram element
        const element = document.createElement('div');
        element.className = 'mermaid';
        element.id = id;
        
        // Very important - remove all leading whitespace from each line
        const processedChart = chart.split('\n')
          .map(line => line.trimStart())
          .join('\n')
          .trim();
        
        element.textContent = processedChart;
        containerRef.current.appendChild(element);
        
        
        // Render using mermaid
        await mermaid.run({
          querySelector: `#${id}`
        });
        
      } catch (error) {
        console.error('Mermaid render error:', error);
        if (containerRef.current) {
          // Use DOM manipulation instead of innerHTML to prevent XSS
          const errorDiv = document.createElement('div');
          errorDiv.className = 'p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded';
          
          const errorTitle = document.createElement('p');
          errorTitle.className = 'font-medium text-red-700 dark:text-red-300';
          errorTitle.textContent = 'Error rendering diagram';
          
          const errorPre = document.createElement('pre');
          errorPre.className = 'mt-2 text-xs bg-white dark:bg-black/30 p-2 rounded overflow-auto';
          errorPre.textContent = error instanceof Error ? error.message : String(error);
          
          errorDiv.appendChild(errorTitle);
          errorDiv.appendChild(errorPre);
          
          const sourceDiv = document.createElement('div');
          sourceDiv.className = 'mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded';
          
          const sourceTitle = document.createElement('p');
          sourceTitle.className = 'text-sm font-medium';
          sourceTitle.textContent = 'Diagram source:';
          
          const sourcePre = document.createElement('pre');
          sourcePre.className = 'mt-2 text-xs bg-white dark:bg-black/30 p-2 rounded overflow-auto';
          sourcePre.textContent = chart;
          
          sourceDiv.appendChild(sourceTitle);
          sourceDiv.appendChild(sourcePre);
          
          containerRef.current.textContent = '';
          containerRef.current.appendChild(errorDiv);
          containerRef.current.appendChild(sourceDiv);
        }
      }
	} catch (error) {
		console.error('Mermaid initialization error:', error);
		if (containerRef.current) {
					  containerRef.current.textContent = '';
		}
	} 	
    };
    
    // First render attempt
    void renderDiagram();
    
    // Second attempt after a delay
    const timer = setTimeout(() => void renderDiagram(), 1000);
    
    return () => { clearTimeout(timer); };
  }, [chart]);

  return (
    <div className="mermaid-container bg-white dark:bg-gray-800 p-6 rounded-xl border shadow-sm overflow-auto" ref={containerRef}>
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
};