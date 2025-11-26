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

  // Check if diagram is valid mermaid code
  const isValidDiagram = diagram && diagram.trim().length > 0 && 
    (diagram.includes('graph') || diagram.includes('flowchart') || 
     diagram.includes('sequenceDiagram') || diagram.includes('classDiagram') ||
     diagram.includes('stateDiagram') || diagram.includes('erDiagram'));

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
                    // Parse bold text **text** -> <strong>text</strong>
                    const parts: React.ReactNode[] = [];
                    let remaining = line;
                    let key = 0;
                    
                    while (remaining.length > 0) {
                      const boldMatch = remaining.match(/\*\*([^*]+?)\*\*/);
                      
                      if (boldMatch && boldMatch.index !== undefined) {
                        // Add text before the bold match
                        const textBefore = remaining.substring(0, boldMatch.index);
                        if (textBefore) parts.push(<span key={key++}>{textBefore}</span>);
                        
                        // Add the bold text
                        parts.push(<strong key={key++} className="font-bold text-blue-600 dark:text-blue-400">{boldMatch[1]}</strong>);
                        
                        // Continue with text after the bold match
                        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
                      } else {
                        // No more bold matches, add remaining text
                        if (remaining) parts.push(<span key={key++}>{remaining}</span>);
                        break;
                      }
                    }
                    
                    return (
                      <span key={lineIndex} className={lineIndex > 0 ? "block" : ""}>
                        {parts}
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>
          )}
          
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 shadow-xl">
            {isValidDiagram ? (
              <div 
                ref={diagramRef}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 overflow-x-auto"
              >
                <pre className="mermaid text-center" suppressHydrationWarning>
                  {diagram}
                </pre>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Architecture diagram will be available soon. Please configure the mermaid diagram in the admin panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
