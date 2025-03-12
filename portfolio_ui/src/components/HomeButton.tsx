// portfolio_ui/src/components/HomeButton.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HomeButton() {
  return (
    <motion.div
      className="fixed top-4 left-4 z-50"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link href="/" aria-label="Go to home page" className="block">
        <div className="bg-white dark:bg-gray-800 h-14 w-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 active:translate-y-0" style={{
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        }}>
          <div className="relative h-10 w-10">
            <Image 
              src="/favicon.ico" 
              alt="Home" 
              fill
              sizes="(max-width: 768px) 24px, 32px"
              className="rounded-full object-contain"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}