// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

// Keep track of initialization globally
let globalMermaidInitialized = false;

export function MermaidScriptLoader() {
  const didInitialize = useRef(false);
  
  useEffect(() => {
    if (didInitialize.current || globalMermaidInitialized) return;
    
    try {
      // Initialize mermaid with default configuration
      mermaid.initialize({
        startOnLoad: true,  // Process diagrams on page load
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
        htmlLabels: true,
        flowchart: {
		  curve: 'linear',
          useMaxWidth: false,
        },
      });
      
      globalMermaidInitialized = true;
      didInitialize.current = true;
      
      
      // Global function to re-render all diagrams
      // Useful for theme changes or dynamic content updates
      window.renderMermaidDiagrams = async () => {
        try {
          await mermaid.run();
        } catch (error) {
          console.error('MermaidScriptLoader: Error rendering diagrams', error);
        }
      };
      
      // Observe theme changes to re-render with appropriate theme
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.attributeName === 'class' && 
            mutation.target === document.documentElement
          ) {
            const isDark = document.documentElement.classList.contains('dark');
            
            mermaid.initialize({
              theme: isDark ? 'dark' : 'default',
            });
            
            if (window.renderMermaidDiagrams) {
              setTimeout(window.renderMermaidDiagrams, 100);
            }
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      return () => observer.disconnect();
      
    } catch (error) {
      console.error('MermaidScriptLoader: Failed to initialize mermaid', error);
    }
  }, []);
  
  return null;
}

// Add this to the Window interface
declare global {
  interface Window {
    renderMermaidDiagrams?: () => Promise<void>;
  }
}

export default MermaidScriptLoader;