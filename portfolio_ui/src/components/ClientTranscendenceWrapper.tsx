// portfolio_ui/src/components/ClientTranscendenceWrapper.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { ErrorBoundary } from '@/components/error/boundary';
import TranscendenceFallback from '@/components/TranscendenceFallback';
import { Suspense } from 'react';

export default function ClientTranscendenceWrapper() {
  interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
}
const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  
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
  fallback={<TranscendenceFallback onRetry={() => window.location.reload()} />}
  onError={(error, info) => {
    console.error('Caught error:', error, info.componentStack);
    setErrorInfo({
      message: error.message,
      stack: info.componentStack || '',
    });
  }}
>
  <Suspense fallback={<TranscendenceFallback />}>
    <TranscendenceProject />
  </Suspense>
</ErrorBoundary>
  );
  
  
}