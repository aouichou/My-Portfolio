// 

'use client';

import { useEffect, useState } from 'react';

export default function LoadingOverlay() {
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    // Simple check for backend
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isLocalhost ? 'http://localhost:8000' : 'https://api.aouichou.me';
    fetch(`${apiUrl}/healthz`)
      .then(response => {
        if (response.ok) {
          setIsVisible(false);
        }
      })
      .catch(() => {
        // Keep visible on error
      });
    
    // Set up countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsVisible(false);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md text-center">
        <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold mb-2">Starting Services</h3>
        <p className="mb-4">Our backend services are warming up...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Auto-continuing in {countdown} seconds
        </p>
        <button 
          onClick={() => setIsVisible(false)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Continue Now
        </button>
      </div>
    </div>
  );
}