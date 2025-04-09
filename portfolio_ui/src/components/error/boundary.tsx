// portfolio_ui/src/components/error/boundary.tsx

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to Sentry only in browser environment
    if (typeof window !== 'undefined') {
      Sentry.captureException(error, {
        tags: {
          errorDigest: (error as any).digest || 'unknown',
          errorStatus: (error as any).status?.toString() || 'unknown'
        },
        extra: {
          componentStack: errorInfo.componentStack
        }
      });
    }
  }
  
  // Reset the error state to try again
  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
              Something went wrong
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              We encountered an error while rendering this component.
            </p>
            
            {/* Only show error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-mono text-sm text-red-700 dark:text-red-300 overflow-auto">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.resetErrorBoundary}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Try again
              </button>
              <Link href="/" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-center transition-colors">
                Return to home page
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience hook-style wrapper for function components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Export a hook-friendly wrapper for Next.js pages
export function createErrorBoundary(fallback?: ReactNode) {
  return function PageWithErrorBoundary({
    children
  }: {
    children: ReactNode;
  }) {
    return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
  };
}