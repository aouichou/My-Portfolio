// portfolio_ui/src/components/LoadingOverlay.tsx

'use client';

import { useState, useEffect } from 'react';

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(false);
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
        console.log("Checking backend service availability...");
        
        // We only need to check the backend since it proxies to the terminal service
        try {
          const backendResponse = await fetch('https://api.aouichou.me/healthz', {
            signal: getTimeoutSignal(5000)
          });
          
          console.log("Backend health check response:", backendResponse.status);
          
          if (backendResponse.ok) {
            console.log("Backend is available");
            setIsVisible(false);
          } else {
            console.log("Backend returned non-OK status");
            setIsVisible(true);
          }
        } catch (e) {
          console.error("Backend health check failed:", e);
          setIsVisible(true);
        }
      } catch (e) {
        console.error("Service check error:", e);
        setIsVisible(true);
      }
    };
    
    // Check immediately on component mount
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
        
        <p className="mb-4">
          Our backend service is warming up. This can take up to 30-45 seconds on first load.
        </p>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Free hosting services spin down after inactivity. Thanks for your patience!
          <br/>Auto-retry: {retryCount}/5
        </p>
        
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