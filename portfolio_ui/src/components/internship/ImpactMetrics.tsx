// components/internship/ImpactMetrics.tsx
'use client';

import type { InternshipImpactMetrics } from '@/library/internship-types';
import { motion, useInView } from 'framer-motion';
import { Award, Code, Shield, TrendingUp, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ImpactMetricsProps {
  metrics: InternshipImpactMetrics;
}

// Animated counter hook
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, hasStarted]);

  return [count, setHasStarted] as const;
}

interface MetricCardProps {
  metric: {
    value: string;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
  };
  index: number;
}

function MetricCard({ metric, index }: MetricCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const Icon = metric.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -10, scale: 1.03 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${metric.color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      <h4 className="text-lg font-semibold mb-2 dark:text-white">
        {metric.label}
      </h4>
      
      <p className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {metric.value}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {metric.description}
      </p>
    </motion.div>
  );
}

export default function ImpactMetrics({ metrics }: ImpactMetricsProps) {
  const displayMetrics = [
    {
      value: metrics.zero_trust_architecture || 'Zero Trust Architecture',
      label: 'Security',
      description: 'Implemented comprehensive Zero Trust security with mTLS, JWT validation, and RBAC',
      icon: Shield,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600'
    },
    {
      value: metrics.reusability || 'Company-Wide Adoption',
      label: 'Reusability',
      description: 'Created internal Keycloak library deployed in 2 production applications',
      icon: Users,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600'
    },
    {
      value: metrics.testing || '85% Coverage',
      label: 'Testing',
      description: '55+ integration tests with comprehensive coverage across critical paths',
      icon: Award,
      color: 'bg-gradient-to-br from-green-500 to-green-600'
    },
    {
      value: metrics.code_quality || 'Zero Defects',
      label: 'Code Quality',
      description: 'All code passed Pylint, Semgrep, and Trivy scans with zero issues',
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600'
    },
    {
      value: 'DDD Refactoring',
      label: 'Architecture',
      description: '40% reduction in complexity through Domain-Driven Design patterns',
      icon: Code,
      color: 'bg-gradient-to-br from-pink-500 to-pink-600'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4 dark:text-white">
            Impact & Achievements
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Measurable contributions to production systems and team capabilities
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayMetrics.map((metric, index) => (
            <MetricCard key={metric.label} metric={metric} index={index} />
          ))}
        </div>

        {/* Additional Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">Lines of Code</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-blue-100">APIs Developed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">12</div>
              <div className="text-blue-100">Documentation</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">3</div>
              <div className="text-blue-100">Production Systems</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
