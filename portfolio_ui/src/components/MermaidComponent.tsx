// components/MermaidComponent.tsx

'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
  chart: string;
}

export const MermaidComponent = ({ chart }: MermaidProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'var(--font-geist-mono)',
    });
    
    if (containerRef.current) {
      try {
        // Clear container first
        containerRef.current.innerHTML = chart;
        mermaid.init(undefined, containerRef.current);
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
  }, [chart]);

  return (
    <div className="mermaid-container bg-white dark:bg-gray-800 p-6 rounded-xl border overflow-auto" ref={containerRef}>
      {chart}
    </div>
  );
};