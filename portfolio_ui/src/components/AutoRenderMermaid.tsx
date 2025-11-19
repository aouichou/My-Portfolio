// portfolio_ui/src/components/AutoRenderMermaid.tsx

'use client';

import { useLayoutEffect } from 'react';

export default function AutoRenderMermaid() {
  useLayoutEffect(() => {
    // Use a more aggressive approach to render diagrams
    const renderAllDiagrams = () => {
      
      if (window.renderMermaidDiagrams) {
        void window.renderMermaidDiagrams();
      } else {
        setTimeout(() => void renderAllDiagrams(), 500);
      }
    };

    // First attempt immediately
    renderAllDiagrams();
    
    // Then try again after content has likely loaded
    const timer1 = setTimeout(renderAllDiagrams, 1000);
    const timer2 = setTimeout(renderAllDiagrams, 2500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);
  
  return null;
}