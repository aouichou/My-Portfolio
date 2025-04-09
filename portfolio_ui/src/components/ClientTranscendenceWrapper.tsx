// portfolio_ui/src/components/ClientTranscendenceWrapper.tsx

'use client';

import React, { useEffect } from 'react';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { ErrorBoundary } from '@/components/error/boundary';
import TranscendenceFallback from '@/components/TranscendenceFallback';

export default function ClientTranscendenceWrapper() {
  useEffect(() => {
    console.log('ClientTranscendenceWrapper mounted');
    return () => console.log('ClientTranscendenceWrapper unmounted');
  }, []);

  return (
    <ErrorBoundary 
      fallback={<TranscendenceFallback />}
      onError={(error, errorInfo) => {
        console.error('TranscendenceProject error:', error);
        console.error('Component stack:', errorInfo?.componentStack);
      }}
    >
      <TranscendenceProject />
    </ErrorBoundary>
  );
}