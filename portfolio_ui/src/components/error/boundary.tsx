// portfolio_ui/src/components/error/boundary.tsx

'use client';

import { useEffect } from 'react';
// sentry import
import * as Sentry from '@sentry/react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
	useEffect(() => {
		console.error('Error boundary caught:', error);
		// Send to error monitoring service (e.g., Sentry)
		if (typeof window !== 'undefined') {
		  Sentry.captureException(error);
		}
	  }, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4">
		<h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
		<button
			onClick={reset}
			className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
			Try again
		</button>
		</div>
	);
}