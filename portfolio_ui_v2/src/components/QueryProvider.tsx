/**
 * QueryProvider — React Query context for client data fetching (F3-08).
 *
 * Mounted once in the root layout. Server components (the projects index)
 * fetch through the typed api-client directly; client surfaces that need
 * cache/retry semantics (terminal token minting, the contact form, future
 * interactive filtering) consume this provider via useQuery/useMutation.
 *
 * Pattern: the QueryClient lives in useState so it is created ONCE per
 * browser session and never re-built on re-render, and never leaks across
 * users on the server (each request would share a module singleton).
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
