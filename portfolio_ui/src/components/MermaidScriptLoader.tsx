// portfolio_ui/src/components/MermaidScriptLoader.tsx

'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function MermaidScriptLoader() {
  const initializeMermaid = () => {
    if (typeof window !== 'undefined' && window.mermaid) {
      window.mermaid.initialize({ 
        startOnLoad: true,
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default'
      });
    }
  };

  useEffect(() => {
    // Try to initialize in case script is already loaded
    initializeMermaid();
  }, []);

  return (
    <Script 
      src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"
      strategy="afterInteractive"
      onLoad={initializeMermaid}
    />
  );
}