// components/MermaidComponent.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

// Track initialization state with a module-level variable
let isMermaidInitialized = false;

export const MermaidComponent = ({ chart }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only initialize once using our tracked variable
    if (!isMermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false, // We'll manually render
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
      });
      isMermaidInitialized = true;
    }
    
	const renderDiagram = async () => {
	  if (containerRef.current) {
		try {
		  // Clear container first
		  containerRef.current.innerHTML = '';
		  
		  // Remove any trailing/leading whitespace from chart
		  const trimmedChart = chart.trim();
		  
		  // Generate a unique ID for this diagram
		  const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
		  
		  // Create element with the mermaid class
		  const element = document.createElement('div');
		  element.className = 'mermaid';
		  element.textContent = trimmedChart;
		  element.id = id;
		  
		  // Add to container
		  containerRef.current.appendChild(element);
		  
		  // Debug log in development
		  if (process.env.NODE_ENV === 'development') {
			console.log('Rendering mermaid diagram:', trimmedChart.substring(0, 50) + '...');
		  }
		  
		  // Render using the mermaid API
		  await mermaid.run({
			querySelector: `#${id}`,
		  });
		} catch (err) {
		  console.error('Mermaid render error:', err);
		  
		  // Show error but also show the diagram code
		  containerRef.current.innerHTML = `
			<div class="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
			  <p class="font-semibold">Error rendering diagram</p>
			  <pre class="text-xs mt-2">${err instanceof Error ? err.message : String(err)}</pre>
			</div>
			<div class="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
			  <p class="text-sm mb-2">Diagram source:</p>
			  <pre class="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto">${
				chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')
			  }</pre>
			</div>
		  `;
		  
		  // Also show the fallback if it exists
		  const fallback = document.querySelector('.fallback-diagram');
		  if (fallback) {
			fallback.classList.remove('hidden');
		  }
		}
	  }
	};
    
    renderDiagram();
  }, [chart]);

  return (
    <div className="mermaid-container bg-white dark:bg-gray-800 p-6 rounded-xl border overflow-auto" ref={containerRef}>
      {/* Diagram will be rendered here */}
    </div>
  );
};