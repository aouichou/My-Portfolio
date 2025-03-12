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
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'var(--font-geist-mono)',
    });
    
    if (containerRef.current) {
      try {
        mermaid.init(undefined, containerRef.current);
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
  }, [chart]);

  return (
    <div className="mermaid-container bg-background p-6 rounded-xl border" ref={containerRef}>
      {chart}
    </div>
  );
};