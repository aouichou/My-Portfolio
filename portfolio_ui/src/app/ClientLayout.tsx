// portfolio/src/app/ClientLayout.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import HomeButton from '../components/HomeButton';
import { usePathname } from 'next/navigation';
import Navbar from '../components/Navbar';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const showHomeButton = true; // Set to true to always show the home button

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          <Navbar />
          {showHomeButton && <HomeButton />}
          {/* Add padding-top to prevent content from hiding under the navbar */}
          <div className="pt-16">
            {children}
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}