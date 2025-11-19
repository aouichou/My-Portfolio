// portfolio_ui/src/components/Navbar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import HomeButton from './HomeButton';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Add this line to check if we're on the homepage
  const isHomepage = pathname === '/';
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => { window.removeEventListener('scroll', handleScroll); };
  }, []);
  
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/90 dark:bg-gray-900/90 shadow-md backdrop-blur-md' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo + Home button */}
          <div className="flex items-center space-x-3">
            <HomeButton />
            <Link href="/" className="flex items-center">
              <span className={`font-bold text-xl ${
                scrolled || !isHomepage 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-white'
              }`}>
                Amine Ouichou
              </span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              href="/projects"
              className={`px-3 py-2 rounded-md ${
                isActive('/projects') 
                  ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' 
                  : `${scrolled || !isHomepage ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'} hover:text-blue-600 dark:hover:text-blue-400`
              } transition-colors`}
            >
              Projects
            </Link>
            
            <Link 
              href="/showcase" 
              className={`px-3 py-2 rounded-md ${
                isActive('/showcase') 
                  ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400' 
                  : `${scrolled || !isHomepage ? 'text-gray-700 dark:text-gray-300' : 'text-white/90'} hover:text-purple-600 dark:hover:text-purple-400`
              } transition-colors`}
            >
              <span className="hidden lg:inline">Portfolio </span>Architecture
            </Link>
            
            <Link 
              href="/#contact" 
              className={`px-3 py-2 rounded-md ${
                scrolled || !isHomepage 
                  ? 'text-gray-700 dark:text-gray-300' 
                  : 'text-white/90'
              } hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
            >
              Contact
            </Link>
            
            <ThemeToggle />
          </div>
          
          {/* Mobile menu toggle */}
          <div className="flex items-center md:hidden">
            <ThemeToggle />
            <button 
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); }}
              className={`ml-2 p-2 rounded-md ${
                scrolled || !isHomepage 
                  ? 'text-gray-700 dark:text-gray-300' 
                  : 'text-white'
              }`}
              aria-label="Toggle menu"
            >
              {!mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 mt-2 p-4 rounded-lg shadow-lg">
            <div className="flex flex-col space-y-3">
              <Link 
                href="/projects"
                className={`px-3 py-2 rounded-md ${
                  isActive('/projects') 
                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                } transition-colors`}
                onClick={() => { setMobileMenuOpen(false); }}
              >
                Projects
              </Link>
              
              <Link 
                href="/showcase" 
                className={`px-3 py-2 rounded-md ${
                  isActive('/showcase') 
                    ? 'bg-purple-600/10 text-purple-600 dark:text-purple-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400'
                } transition-colors`}
                onClick={() => { setMobileMenuOpen(false); }}
              >
                Portfolio Architecture
              </Link>
              
              <Link 
                href="/#contact" 
                className="px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}