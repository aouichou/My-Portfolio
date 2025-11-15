// portfolio_ui/src/components/ServiceWarmup.tsx

'use client';

import { useEffect } from 'react';

export default function ServiceWarmup() {
  useEffect(() => {
    // Initial warm-up on page load
    const warmupServices = async () => {
      try {
        // Warm up backend
        await fetch('https://api.aouichou.me/healthz', { 
          method: 'GET',
          mode: 'no-cors'
        });
        
        // Warm up terminal service
        await fetch('https://portfolio-terminal-4t9w.onrender.com/healthz', { 
          method: 'GET',
          mode: 'no-cors'
        });
        
      } catch (e) {
        console.error("Service warmup error:", e);
      }
    };
    
    // Run immediately on page load
    void warmupServices();
    
    // Then run periodically
    const interval = setInterval(warmupServices, 8 * 60 * 1000); // 8 minutes
    
    return () => { clearInterval(interval); };
  }, []);
  
  return null; // Invisible component
}