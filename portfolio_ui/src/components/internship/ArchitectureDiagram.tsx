// components/internship/ArchitectureDiagram.tsx
'use client';

import { useEffect, useRef } from 'react';

interface ArchitectureDiagramProps {
  diagram: string;
  title?: string;
  description?: string;
}

export default function ArchitectureDiagram({ 
  diagram, 
  title = "Zero Trust Architecture",
  description 
}: ArchitectureDiagramProps) {
  const diagramRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, [diagram]);

  return (
    <section id="architecture" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 dark:text-white text-center">
            {title}
          </h2>
          {description && (
            <div className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              {description.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 last:mb-0">
                  {paragraph.split('\n').map((line, lineIndex) => {
                    // Check if line starts with **text** for bold formatting
                    const boldMatch = line.match(/^\*\*(.*?)\*\*$/);
                    if (boldMatch) {
                      return (
                        <span key={lineIndex} className="block">
                          <strong className="text-blue-600 dark:text-blue-400">{boldMatch[1]}</strong>
                        </span>
                      );
                    }
                    return lineIndex > 0 ? <span key={lineIndex} className="block">{line}</span> : line;
                  })}
                </p>
              ))}
            </div>
          )}
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 shadow-xl">
            <div 
              ref={diagramRef}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 overflow-x-auto"
            >
              <pre className="mermaid text-center" suppressHydrationWarning>
                {diagram}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
