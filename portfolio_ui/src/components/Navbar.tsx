// portfolio_ui/src/components/Navbar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-40 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-bold text-xl">Amine Ouichou</Link>
        
        <div className="flex items-center gap-6">
          <Link 
            href="/projects"
            className={`px-3 py-2 ${pathname === '/projects' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'} transition-colors`}
          >
            Projects
          </Link>
          
          <Link 
            href="/showcase" 
            className={`px-3 py-2 ${pathname === '/showcase' ? 'text-blue-600 dark:text-blue-400' : 'hover:text-blue-600 dark:hover:text-blue-400'} transition-colors`}
          >
            Architecture
          </Link>
          
			<Link 
			  href="/#contact" 
			  className="px-3 py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
			>
			  Contact
			</Link>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}