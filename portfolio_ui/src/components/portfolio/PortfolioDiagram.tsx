// portfolio_ui/src/components/portfolio/PortfolioDiagram.tsx
'use client';

import { useEffect, useRef } from 'react';

interface PortfolioDiagramProps {
  diagram: string;
  title: string;
  figureNumber: number;
}

export default function PortfolioDiagram({ 
  diagram, 
  title,
  figureNumber
}: PortfolioDiagramProps) {
  const diagramRef = useRef<HTMLDivElement>(null);

  // Check if diagram is valid mermaid code
  const isValidDiagram = diagram && diagram.trim().length > 0 && 
    (diagram.includes('graph') || diagram.includes('flowchart'));

  useEffect(() => {
    if (!isValidDiagram) return;
    
    const renderDiagram = () => {
      if (typeof window !== 'undefined' && window.renderMermaidDiagrams) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          window.renderMermaidDiagrams?.();
        }, 100);
      } else {
        // Retry if renderMermaidDiagrams is not yet available
        setTimeout(renderDiagram, 500);
      }
    };

    renderDiagram();
  }, [diagram, isValidDiagram]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded border border-gray-200 dark:border-gray-700">
      {isValidDiagram ? (
        <div 
          ref={diagramRef}
          className="bg-white dark:bg-gray-900 rounded-xl p-6 overflow-x-auto min-h-[400px]"
        >
          <pre className="mermaid text-center" suppressHydrationWarning>
            {diagram}
          </pre>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Diagram will be available soon.
          </p>
        </div>
      )}
      <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Figure {figureNumber}: {title}
      </div>
    </div>
  );
}
