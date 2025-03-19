// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

export function MermaidScriptLoader() {
  const isInitialized = useRef(false);
  
  useEffect(() => {
    // Ensure this runs only once per instance
    if (isInitialized.current) return;
    
    console.log('Initializing Mermaid...');
    
    // Force re-initialization with fresh config
    try {
      mermaid.initialize({
        startOnLoad: true,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-geist-mono)',
        flowchart: {
          htmlLabels: true,
          curve: 'linear',
        },
        er: {
          useMaxWidth: false,
        }
      });
      isInitialized.current = true;
      console.log('Mermaid initialized successfully');
    } catch (e) {
      console.error('Error initializing Mermaid:', e);
    }
    
    // Function to render all mermaid diagrams
    const renderAllDiagrams = async () => {
      try {
        const diagrams = document.querySelectorAll('.mermaid');
        console.log(`Found ${diagrams.length} mermaid diagrams to render`);
        
        if (diagrams.length > 0) {
          await mermaid.run({
            querySelector: '.mermaid',
          });
          console.log('Mermaid diagrams rendered successfully');
        }
      } catch (error) {
        console.error('Failed to render mermaid diagrams:', error);
      }
    };
    
    // Render after a delay to ensure DOM is ready
    const timerId = setTimeout(() => {
      renderAllDiagrams();
    }, 500);
    
    // Also render on theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            mutation.target === document.documentElement) {
          const isDark = document.documentElement.classList.contains('dark');
          console.log(`Theme changed to ${isDark ? 'dark' : 'light'}, reinitializing Mermaid`);
          
          mermaid.initialize({
            theme: isDark ? 'dark' : 'default',
          });
          
          setTimeout(renderAllDiagrams, 100);
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      clearTimeout(timerId);
      observer.disconnect();
    };
  }, []);
  
  return null;
}

export default MermaidScriptLoader;