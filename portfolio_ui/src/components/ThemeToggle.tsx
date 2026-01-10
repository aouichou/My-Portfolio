// src/components/ThemeToggle.tsx

'use client';

import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative flex h-8 w-14 items-center justify-center rounded-full p-1 bg-linear-to-r from-blue-600/40 to-purple-600/40 dark:from-blue-900/50 dark:to-purple-900/50 border border-gray-200/30 dark:border-gray-700/30 shadow-sm"
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <span className="sr-only">Toggle theme</span>
      
      <motion.div 
        className={`absolute left-1 top-1 h-6 w-6 rounded-full flex items-center justify-center shadow-md ${
          isDark ? 'bg-gray-700' : 'bg-white'
        }`}
        animate={{
          x: isDark ? 26 : 0
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {isDark ? (
          <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 text-yellow-300" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            initial={{ opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ delay: 0.1 }}
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </motion.svg>
        ) : (
          <motion.svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 text-yellow-500" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </motion.svg>
        )}
      </motion.div>
      
      {/* Extra stars for dark mode */}
      {isDark && (
        <>
          <motion.span 
            className="absolute h-1 w-1 rounded-full bg-white" 
            style={{ top: '4px', right: '6px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5, 1, 0], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
          />
          <motion.span 
            className="absolute h-0.5 w-0.5 rounded-full bg-white" 
            style={{ top: '12px', right: '10px' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.5, 1, 0], scale: [0.8, 1, 0.8] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }}
          />
        </>
      )}
    </motion.button>
  );
}