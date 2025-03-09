// portfolio_ui/src/components/error/boundary.tsx

'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string; status?: number };
  reset: () => void;
  fallback?: React.ReactNode;
}

export default function ErrorBoundary({
  error,
  reset,
  fallback
}: ErrorBoundaryProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('Error boundary caught:', error);
    
    // Send to Sentry only in browser environment
    if (typeof window !== 'undefined') {
      Sentry.captureException(error, {
        tags: {
          errorDigest: error.digest || 'unknown',
          errorStatus: error.status?.toString() || 'unknown'
        }
      });
    }
  }, [error]);

  // Use custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Something went wrong!</h2>
      
      {/* Only show error details in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 max-w-lg overflow-auto">
          <p className="text-red-700 dark:text-red-300 font-mono text-sm">
            {error.message}
          </p>
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
        >
          Go Home
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}