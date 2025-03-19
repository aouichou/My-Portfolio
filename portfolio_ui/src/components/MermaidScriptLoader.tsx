// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export function MermaidScriptLoader() {
  // Use a ref to track initialization inside this component
  const isInitialized = useRef(false);
  
  useEffect(() => {
    // Initialize mermaid with proper config
    if (!isInitialized.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
      });
      isInitialized.current = true;
    }
    
    // Render mermaid diagrams
    const renderMermaid = async () => {
      try {
        // This will find all elements with class 'mermaid' and render them
        await mermaid.run({
          querySelector: '.mermaid'
        });
      } catch (error) {
        console.error('Mermaid global rendering error:', error);
      }
    };
    
    // Wait a moment for the DOM to be fully ready
    setTimeout(renderMermaid, 200);
    
    // Register a theme observer to re-render on theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            (mutation.target as Element).classList.contains('dark')) {
          // Re-initialize with dark theme
          mermaid.initialize({
            startOnLoad: false,
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          });
          renderMermaid();
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);
  
  return null;
}

export default MermaidScriptLoader;