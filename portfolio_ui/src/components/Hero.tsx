// src/components/Hero.tsx

'use client';

import { motion } from 'framer-motion';
import { AiOutlineGithub, AiOutlineLinkedin } from 'react-icons/ai';
import Link from 'next/link';

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-28"
    >
      <div className="container mx-auto text-center px-4">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Full Stack Developer and DevOps Engineer
        </h1>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <a href="#projects" className="btn-primary">
            View Work
          </a>
          <a 
            href="/resume.pdf"
            download="amine-ouichou-resume.pdf"
            className="btn-outline"
          >
            Download Resume
          </a>
          <Link href="/showcase" className="btn-primary bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
            </svg>
            Portfolio Architecture
          </Link>
          <a href="#contact" className="btn-primary">
            Let's Connect
          </a>
        </div>
        <div className="flex justify-center gap-4 mt-6">
          <a 
            href="https://github.com/aouichou" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-gray-300 text-2xl"
          >
            <AiOutlineGithub />
          </a>
          <a 
            href="https://linkedin.com/in/amine-ouichou-168236345" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-gray-300 text-2xl"
          >
            <AiOutlineLinkedin />
          </a>
        </div>
      </div>
    </motion.section>
  );
}