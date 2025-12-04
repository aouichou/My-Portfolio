// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

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
          useMaxWidth: true,
          htmlLabels: true,
          nodeSpacing: 50,
          rankSpacing: 50,
          padding: 20,
        },
      });
      
      globalMermaidInitialized = true;
      didInitialize.current = true;
      
      
      // Global function to re-render all diagrams
      // Useful for theme changes or dynamic content updates
      window.renderMermaidDiagrams = async () => {
        try {
          const mermaidElements = document.querySelectorAll('.mermaid');
          
          if (mermaidElements.length === 0) {
            return;
          }
          
          await mermaid.run({
            querySelector: '.mermaid'
          });
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
              void setTimeout(() => void window.renderMermaidDiagrams?.(), 100);
            }
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      
      return () => { observer.disconnect(); };
      
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