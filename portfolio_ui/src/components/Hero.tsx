// src/components/Hero.tsx

'use client';

import { motion } from 'framer-motion';
import { AiOutlineGithub, AiOutlineLinkedin } from 'react-icons/ai';

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
        <div className="flex justify-center gap-6 mt-8">
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
