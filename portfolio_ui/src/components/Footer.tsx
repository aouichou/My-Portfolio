// portfolio_ui/src/components/Footer.tsx

'use client';

import Link from 'next/link';
import { AiOutlineGithub, AiOutlineLinkedin } from 'react-icons/ai';
import { motion } from 'framer-motion';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-8 border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600 dark:text-gray-300">
              © {currentYear} Amine Ouichou. All rights reserved.
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <Link href="/projects" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
              Projects
            </Link>
            <Link href="/showcase" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition">
              Architecture
            </Link>
            <Link href="/#contact" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition">
              Contact
            </Link>
            
            <div className="ml-4 flex space-x-4">
              <motion.a
                href="https://github.com/aouichou"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <AiOutlineGithub size={24} />
                <span className="sr-only">GitHub</span>
              </motion.a>
              <motion.a
                href="https://linkedin.com/in/amine-ouichou-168236345"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <AiOutlineLinkedin size={24} />
                <span className="sr-only">LinkedIn</span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}