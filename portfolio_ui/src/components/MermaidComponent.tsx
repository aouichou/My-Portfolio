// components/MermaidComponent.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export const MermaidComponent = ({ chart }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once per component
    if (!mermaidInitialized.current) {
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
        flowchart: {
          htmlLabels: true,
          curve: 'linear',
        }
      });
      mermaidInitialized.current = true;
    }

    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        // Clean the container first
        containerRef.current.innerHTML = '';
        
        // Generate a unique ID
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Create a wrapper element with the mermaid class
        const mermaidDiv = document.createElement('div');
        mermaidDiv.className = 'mermaid';
        mermaidDiv.id = id;
        
        // We need to ensure there's no indentation in the diagram text
        const cleanedChart = chart.trim().replace(/^\s+/gm, '');
        mermaidDiv.textContent = cleanedChart;
        
        // Add to container and render
        containerRef.current.appendChild(mermaidDiv);
        
        console.log(`Rendering mermaid diagram with ID: ${id}`);
        console.log(`Diagram content:\n${cleanedChart}`);
        
        // Render with a slight delay to ensure the element is in the DOM
        setTimeout(async () => {
          try {
            await mermaid.run({
              querySelector: `#${id}`
            });
            console.log(`Successfully rendered diagram ${id}`);
          } catch (err) {
            console.error(`Failed to render diagram:`, err);
            showError(err);
          }
        }, 100);
      } catch (error) {
        console.error('Error in mermaid diagram rendering:', error);
        showError(error);
      }
    };
    
    const showError = (error: any) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <h4 class="text-red-800 dark:text-red-300 font-medium">Diagram Rendering Error</h4>
            <pre class="mt-2 text-xs overflow-auto p-2 bg-white dark:bg-gray-800 rounded">${error?.message || String(error)}</pre>
            <div class="mt-4">
              <h5 class="font-medium text-sm">Diagram Source:</h5>
              <pre class="mt-1 text-xs overflow-auto p-2 bg-white dark:bg-gray-800 rounded">${chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
          </div>
        `;
      }
    };
    
    renderDiagram();
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