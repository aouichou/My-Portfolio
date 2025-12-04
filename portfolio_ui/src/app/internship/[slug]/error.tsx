// app/internship/[slug]/error.tsx
'use client';

import { AlertCircle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

export default function InternshipProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Internship project error:', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Project Not Found
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            We couldn't load this project. It may not exist or there might be a temporary issue.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            
            <Link
              href="/internship"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Internship
            </Link>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>

          {error.digest && (
            <p className="mt-6 text-xs text-gray-500 dark:text-gray-600">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
