// portfolio_ui/src/components/Navbar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { useState, useEffect } from 'react';
import HomeButton from './HomeButton';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled ? 'bg-white/90 dark:bg-gray-900/90 shadow-md backdrop-blur-md' : 
      'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* Home button and name properly aligned */}
            <Link href="/" className="flex items-center space-x-3">
              <HomeButton />
              <span className={`font-bold text-xl ${scrolled ? 'text-gray-900 dark:text-white' : 'text-white'}`}>
                Amine Ouichou
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-4">
            <Link 
              href="/projects"
              className={`px-3 py-2 rounded-md ${
                isActive('/projects') 
                  ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' 
                  : `${scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'} hover:text-blue-600 dark:hover:text-blue-400`
              } transition-colors`}
            >
              Projects
            </Link>
            
            <Link 
              href="/showcase" 
              className={`px-3 py-2 rounded-md ${
                isActive('/showcase') 
                  ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400' 
                  : `${scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'} hover:text-purple-600 dark:hover:text-purple-400`
              } transition-colors`}
            >
              <span className="hidden sm:inline">Portfolio </span>Architecture
            </Link>
            
            <Link 
              href="/#contact" 
              className={`px-3 py-2 rounded-md ${scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'} hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
            >
              Contact
            </Link>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}