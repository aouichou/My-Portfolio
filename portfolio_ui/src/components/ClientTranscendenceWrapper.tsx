// portfolio_ui/src/components/ClientTranscendenceWrapper.tsx

'use client';

import React from 'react';
import { TranscendenceProject } from '@/components/TranscendenceProject';
import { ErrorBoundary } from '@/components/error/boundary';
import TranscendenceFallback from '@/components/TranscendenceFallback';

export default function ClientTranscendenceWrapper() {
  return (
    <ErrorBoundary fallback={<TranscendenceFallback />}>
      <TranscendenceProject />
    </ErrorBoundary>
  );
}