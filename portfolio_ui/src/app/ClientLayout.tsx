// portfolio/src/app/ClientLayout.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import HomeButton from '../components/HomeButton';
import Navbar from '../components/Navbar';
import { usePathname } from 'next/navigation';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  
  // Keep HomeButton for legacy support on deep pages, but the main nav is now Navbar
  const showHomeButton = pathname !== '/' && pathname.split('/').filter(Boolean).length > 1;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Navbar />
          {showHomeButton && <HomeButton />}
          <div className={pathname === '/' ? '' : 'pt-16'}>
            {children}
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}