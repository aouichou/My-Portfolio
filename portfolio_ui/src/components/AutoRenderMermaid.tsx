// portfolio_ui/src/components/AutoRenderMermaid.tsx

'use client';

import { useLayoutEffect } from 'react';

export default function AutoRenderMermaid() {
  useLayoutEffect(() => {
    // Use a more aggressive approach to render diagrams
    const renderAllDiagrams = () => {
      console.log("AutoRenderMermaid: Trying to render all diagrams");
      
      if (window.renderMermaidDiagrams) {
        window.renderMermaidDiagrams();
      } else {
        console.log("renderMermaidDiagrams not available yet, trying again in 500ms");
        setTimeout(renderAllDiagrams, 500);
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