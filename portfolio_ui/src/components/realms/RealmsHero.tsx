// components/realms/RealmsHero.tsx
'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Gamepad2 } from 'lucide-react';
import { HERO_STATS } from '../../data/realms-content';

export default function RealmsHero() {
  return (
    <section className="relative bg-linear-to-r from-emerald-900 via-teal-900 to-cyan-900 text-white py-28 md:py-40 overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-10 left-1/2 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Built for Mistral AI — ~3 Weeks
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
          >
            Mistral Realms
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-3xl mx-auto"
          >
            AI-Powered Dungeons &amp; Dragons Platform — Agents, Tool Calling, Embeddings, Image Generation, and Multi-Provider Fallback
          </motion.p>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-10"
          >
            {HERO_STATS.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.08 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/20 transition-all duration-200"
              >
                <div className={`text-2xl md:text-3xl font-bold mb-1 ${
                  stat.color === 'emerald' ? 'text-emerald-300' : 'text-teal-300'
                }`}>
                  {stat.value}
                </div>
                <div className="text-xs text-emerald-100">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="https://realms.anguelz.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-emerald-900 font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
            >
              Play Now
              <Gamepad2 className="ml-2 h-5 w-5" />
            </a>
            <a
              href="https://github.com/aouichou/Realms"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200"
            >
              View Source
              <ExternalLink className="ml-2 h-5 w-5" />
            </a>
          </motion.div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(10px, 10px) scale(1.05); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </section>
  );
}
