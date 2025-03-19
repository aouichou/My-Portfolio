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
    
    console.log('MermaidScriptLoader: Initializing mermaid globally...');
    
    try {
      // Initialize mermaid with default configuration
      mermaid.initialize({
        startOnLoad: true,  // Process diagrams on page load
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
        htmlLabels: true,
        flowchart: {
          curve: 'basis',
          useMaxWidth: false,
        },
      });
      
      globalMermaidInitialized = true;
      didInitialize.current = true;
      
      console.log('MermaidScriptLoader: Initialization complete');
      
      // Global function to re-render all diagrams
      // Useful for theme changes or dynamic content updates
      window.renderMermaidDiagrams = async () => {
        console.log('MermaidScriptLoader: Rendering all diagrams');
        try {
          await mermaid.run();
          console.log('MermaidScriptLoader: All diagrams rendered');
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
            console.log(`MermaidScriptLoader: Theme changed to ${isDark ? 'dark' : 'light'}`);
            
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