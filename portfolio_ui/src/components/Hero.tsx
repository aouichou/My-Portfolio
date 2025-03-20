// src/components/Hero.tsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { HiOutlineDocumentDownload } from 'react-icons/hi';

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-20 md:py-28"
    >
      <div className="container mx-auto text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Full Stack Developer and DevOps Engineer
        </h1>
        <div className="flex justify-center gap-6 mt-8">
          <a 
            href="/resume.pdf"
            download="amine-ouichou-resume.pdf"
            className="btn-primary bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 flex items-center"
          >
            <HiOutlineDocumentDownload className="h-3 w-6 mr-2" />
            Download Resume
          </a>
        </div>
      </div>
    </motion.section>
  );
}