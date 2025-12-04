// components/internship/InternshipHero.tsx
'use client';

import { motion } from 'framer-motion';
import { Award, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

interface InternshipHeroProps {
  company: string;
  role: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  stats: {
    lines_of_code?: string;
    test_coverage?: string;
    apis_developed?: string;
    test_files?: string;
    documentation_pages?: string;
  };
}

export default function InternshipHero({
  company,
  role,
  subtitle,
  startDate,
  endDate,
  stats
}: InternshipHeroProps) {
  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Calculate duration
  const calculateDuration = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    return `${months} months`;
  };

  const displayStats = [
    { value: stats.lines_of_code || '10K+', label: 'Lines of Code', color: 'blue' },
    { value: stats.test_coverage || '85%', label: 'Test Coverage', color: 'purple' },
    { value: stats.apis_developed || '15+', label: 'APIs Developed', color: 'blue' },
    { value: stats.documentation_pages || '12', label: 'Documentation', color: 'purple' }
  ];

  return (
    <section className="relative bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 text-white py-28 md:py-40 overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-10 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
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
              <Calendar className="mr-2 h-4 w-4" />
              {formatDate(startDate)} - {formatDate(endDate)} ({calculateDuration()})
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
          >
            {role} @ {company}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto"
          >
            {subtitle}
          </motion.p>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10"
          >
            {displayStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all duration-200"
              >
                <div className={`text-3xl md:text-4xl font-bold mb-2 ${
                  stat.color === 'blue' 
                    ? 'text-blue-300' 
                    : 'text-purple-300'
                }`}>
                  {stat.value}
                </div>
                <div className="text-sm text-blue-100">
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
            <Link
              href="#projects"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white text-blue-900 font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transform transition-all duration-200"
            >
              Explore Projects
              <Award className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="#architecture"
              className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200"
            >
              View Architecture
              <MapPin className="ml-2 h-5 w-5" />
            </Link>
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
