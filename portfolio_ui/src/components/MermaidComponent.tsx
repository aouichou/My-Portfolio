// components/MermaidComponent.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

// Track initialization
let initializePromise: Promise<void> | null = null;

const ensureMermaidInitialized = async () => {
  if (!initializePromise) {
    initializePromise = new Promise<void>((resolve) => {
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
      resolve();
    });
  }
  return initializePromise;
};

export const MermaidComponent = ({ chart }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef(chart);

  useEffect(() => {
    chartRef.current = chart; // Update ref when prop changes
    
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        // Ensure mermaid is initialized
        await ensureMermaidInitialized();
        
        // Clean container
        containerRef.current.innerHTML = '';
        
        // Prepare diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const diagramElement = document.createElement('div');
        diagramElement.id = id;
        diagramElement.className = 'mermaid';
        diagramElement.textContent = chart;
        containerRef.current.appendChild(diagramElement);
        
        console.log(`Rendering diagram with ID ${id}`);
        console.log(`Diagram content (first 50 chars): ${chart.substring(0, 50)}...`);
        
        // Force render with delay
        setTimeout(async () => {
          try {
            await mermaid.run({
              querySelector: `#${id}`
            });
            console.log(`Successfully rendered diagram ${id}`);
          } catch (innerError) {
            console.error(`Inner rendering error for ${id}:`, innerError);
            showErrorMessage(innerError);
          }
        }, 100);
      } catch (error) {
        console.error('Mermaid component error:', error);
        showErrorMessage(error);
      }
    };
    
    const showErrorMessage = (error: unknown) => {
      if (!containerRef.current) return;
      
      containerRef.current.innerHTML = `
        <div class="p-4 border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
          <h4 class="text-red-800 dark:text-red-300 font-medium mb-2">Error rendering diagram</h4>
          <pre class="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/40 p-2 rounded overflow-x-auto">${
            error instanceof Error ? error.message : String(error)
          }</pre>
          <div class="mt-4">
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">Diagram source:</p>
            <pre class="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-x-auto">${
              chart.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }</pre>
          </div>
        </div>
      `;
    };
    
    // Render after a small delay to ensure component is mounted
    const timer = setTimeout(() => {
      renderDiagram();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [chart]);

  return (
    <div className="mermaid-container bg-white dark:bg-gray-800 p-6 rounded-xl border overflow-x-auto" ref={containerRef}>
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};