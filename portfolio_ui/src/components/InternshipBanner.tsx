// components/InternshipBanner.tsx
'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Code, FileText, Users } from 'lucide-react';
import Link from 'next/link';

export default function InternshipBanner() {
  const stats = [
    { value: '10,000+', label: 'Lines of Code', icon: Code },
    { value: '12', label: 'Documentation', icon: FileText },
    { value: '3', label: 'Teams Supported', icon: Users }
  ];

  return (
    <section className="relative py-16 md:py-20 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-purple-900/20" />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
              <span className="mr-2">✨</span>
              Professional Experience
            </span>
          </motion.div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-center md:text-left">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                Healthcare Technology Internship
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-700 dark:text-gray-300 mb-6"
              >
                Architected and implemented production-grade healthcare analytics platform with Zero Trust security, microservices architecture, and enterprise observability.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <Link
                  href="/internship"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  View Full Story
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </motion.div>
            </div>

            {/* Right: Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    whileHover={{ y: -5, scale: 1.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 text-center"
                  >
                    <div className="flex justify-center mb-2">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
                        <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(10px, 10px) scale(1.05); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </section>
  );
}
