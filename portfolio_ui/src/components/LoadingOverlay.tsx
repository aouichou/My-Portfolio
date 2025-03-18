// portfolio_ui/src/components/LoadingOverlay.tsx - Updated version

'use client';

import { useState, useEffect } from 'react';

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    // Feature detection for AbortSignal.timeout
    const getTimeoutSignal = (ms: number) => {
      try {
        if ('AbortSignal' in window && 'timeout' in AbortSignal) {
          return (AbortSignal as any).timeout(ms);
        }
      } catch (e) {
        console.warn("AbortSignal.timeout not available:", e);
      }
      return undefined;
    };
    
    const checkServices = async () => {
      try {
        console.log("Checking service availability...");
        
        // First check if the backend is responsive
        try {
          const backendResponse = await fetch('https://api.aouichou.me/healthz', {
            signal: getTimeoutSignal(3000)
          });
          
          console.log("Backend health check response:", backendResponse.status);
          
          if (!backendResponse.ok) {
            setStatus('backend');
            setIsVisible(true);
            return;
          }
        } catch (e) {
          console.error("Backend health check failed:", e);
          setStatus('backend');
          setIsVisible(true);
          return;
        }
        
        // Then check if terminal service is responsive
        try {
          const terminalResponse = await fetch('https://portfolio-terminal-4t9w.onrender.com/healthz', {
            signal: getTimeoutSignal(3000)
          });
          
          console.log("Terminal service health check response:", terminalResponse.status);
          
          if (!terminalResponse.ok) {
            setStatus('terminal');
            setIsVisible(true);
            return;
          }
        } catch (e) {
          console.error("Terminal health check failed:", e);
          setStatus('terminal');
          setIsVisible(true);
          return;
        }
        
        // All services are running successfully
        console.log("All services are available");
        setIsVisible(false);
      } catch (e) {
        console.error("Service check error:", e);
        setStatus('unknown');
        setIsVisible(true);
      }
    };
    
    // Initial check
    checkServices();
    
    // Set up automatic retry if services are down
    const retryInterval = setInterval(() => {
      if (isVisible && retryCount < 5) {
        console.log(`Auto-retrying service check (${retryCount + 1}/5)...`);
        checkServices();
        setRetryCount(prev => prev + 1);
      } else if (retryCount >= 5) {
        clearInterval(retryInterval);
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(retryInterval);
  }, [isVisible, retryCount]);
  
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
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Free hosting services spin down after inactivity. Thanks for your patience! ({retryCount}/5 auto-retries)</p>
        
        <button 
          onClick={() => {
            setRetryCount(0);
            window.location.reload();
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}