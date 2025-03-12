// portfolio/src/app/ClientLayout.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import HomeButton from '../components/HomeButton';
import { usePathname } from 'next/navigation';


export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
//   const showHomeButton = pathname !== '/'; // Only show on non-home pages
  const showHomeButton = true; // Always show

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <div className="fixed top-4 right-4 z-50">
            <ThemeToggle />
          </div>
		  {showHomeButton && <HomeButton />}
          {children}
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}