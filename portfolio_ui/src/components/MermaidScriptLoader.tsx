// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import { useEffect } from 'react';
import mermaid from 'mermaid';

export function MermaidScriptLoader() {
  useEffect(() => {
    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'strict',
    });
    
    // Render mermaid diagrams
    setTimeout(() => {
      try {
        // This is the correct way to call mermaid's run function
        mermaid.run({
          querySelector: '.mermaid' // Use querySelector instead of nodes
        });
      } catch (error) {
        console.error('Mermaid rendering error:', error);
      }
    }, 200);
  }, []);
  
  return null;
}

export default MermaidScriptLoader;