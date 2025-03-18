// portfolio_ui/src/components/LoadingOverlay.tsx

'use client';

import { useState, useEffect } from 'react';

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState('checking');
  
  useEffect(() => {
    const checkServices = async () => {
      try {
       		 // First check if the backend is responsive
			const backendResponse = await fetch('https://api.aouichou.me/healthz', {
				signal: 'AbortSignal' in window && 'timeout' in AbortSignal 
				  ? AbortSignal.timeout(3000) 
				  : undefined
			  });
        
        if (!backendResponse.ok) {
          setStatus('backend');
          setIsVisible(true);
          return;
        }
        
        // Then check if terminal service is responsive
        const terminalResponse = await fetch('https://portfolio-terminal-4t9w.onrender.com/healthz', {
          signal: AbortSignal.timeout(3000)
        });
        
        if (!terminalResponse.ok) {
          setStatus('terminal');
          setIsVisible(true);
          return;
        }
        
        // All services are running
        setIsVisible(false);
      } catch (e) {
        console.error("Service check error:", e);
        setStatus('unknown');
        setIsVisible(true);
      }
    };
    
    checkServices();
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold mb-2">Starting Services</h3>
        
        {status === 'backend' && (
          <p className="mb-4">Our backend service is warming up. This usually takes about 30 seconds.</p>
        )}
        
        {status === 'terminal' && (
          <p className="mb-4">The terminal service is starting. This usually takes about 45 seconds.</p>
        )}
        
        {status === 'unknown' && (
          <p className="mb-4">Connecting to services. This may take up to a minute on first load.</p>
        )}
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Free hosting services spin down after inactivity. Thanks for your patience!</p>
        
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}