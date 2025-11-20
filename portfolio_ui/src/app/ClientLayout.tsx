// portfolio/src/app/ClientLayout.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Footer from '../components/Footer';
import MermaidScriptLoader from '../components/MermaidScriptLoader';
import Navbar from '../components/Navbar';
import { ThemeProvider } from '../context/ThemeContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MermaidScriptLoader />
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
		  <Navbar />
          {/* {showHomeButton && <HomeButton />} */}
          <div className={pathname === '/' ? '' : 'pt-16'}>
            {children}
          </div>
		  <Footer />
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}