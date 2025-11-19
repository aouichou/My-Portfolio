// portfolio_ui/src/components/ServiceWarmup.tsx

'use client';

import { useEffect } from 'react';

export default function ServiceWarmup() {
  useEffect(() => {
    // Initial warm-up on page load
    const warmupServices = async () => {
      try {
        // Warm up backend
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const apiUrl = isLocalhost ? 'http://localhost:8000' : 'https://api.aouichou.me';
        await fetch(`${apiUrl}/healthz`, { 
          method: 'GET',
          mode: 'no-cors'
        });
        
        // Warm up terminal service
        const terminalUrl = process.env.NEXT_PUBLIC_TERMINAL_WS_URL?.replace('ws://', 'http://').replace(':8001', ':8001') || 'https://portfolio-terminal-4t9w.onrender.com';
        await fetch(`${terminalUrl}/healthz`, { 
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
    const interval = setInterval(() => void warmupServices(), 8 * 60 * 1000); // 8 minutes
    
    return () => { clearInterval(interval); };
  }, []);
  
  return null; // Invisible component
}