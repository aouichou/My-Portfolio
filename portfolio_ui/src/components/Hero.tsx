// src/components/Hero.tsx

'use client';

import { motion } from 'framer-motion';
import { HiOutlineDocumentDownload } from 'react-icons/hi';

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-linear-to-r from-gray-900 to-blue-900 text-white py-28 md:py-40"
    >
      <div className="container mx-auto text-center px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Full Stack Developer and DevOps Engineer
        </h1>
        <div className="flex justify-center gap-6 mt-8">
          <a 
            href="/resume.pdf"
            download="amine-ouichou-resume.pdf"
            className="px-8 py-2.5 bg-linear-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white rounded-full font-medium transition-colors shadow-md hover:shadow-lg text-base flex items-center"
          >
            Download Resume
            <HiOutlineDocumentDownload className="h-5 w-5 ml-2" />
          </a>
        </div>
      </div>
    </motion.section>
  );
}