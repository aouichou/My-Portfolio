// portfolio_ui/src/components/ClientTranscendenceWrapper.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { ErrorBoundary } from '@/components/error/boundary';
import TranscendenceFallback from '@/components/TranscendenceFallback';

export default function ClientTranscendenceWrapper() {
  const [errorInfo, setErrorInfo] = useState<any>(null);
  
  useEffect(() => {
    console.log('ClientTranscendenceWrapper mounted');
    
    // Add window error handler to catch unhandled errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      setErrorInfo({
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || ''
      });
    };
    
    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
      console.log('ClientTranscendenceWrapper unmounted');
    };
  }, []);

  return (
    <ErrorBoundary 
      fallback={
        <div>
          {errorInfo && (
            <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-lg">
              <h3>Debug Info:</h3>
              <pre className="text-xs mt-2 p-2 bg-gray-800 text-white overflow-auto">
                {JSON.stringify(errorInfo, null, 2)}
              </pre>
            </div>
          )}
          <TranscendenceFallback />
        </div>
      }
      onError={(error, errorInfo) => {
        console.error('TranscendenceProject error:', error);
        console.error('Component stack:', errorInfo?.componentStack);
        setErrorInfo({
          message: error.message,
          componentStack: errorInfo?.componentStack
        });
      }}
    >
      <TranscendenceProject />
    </ErrorBoundary>
  );
}