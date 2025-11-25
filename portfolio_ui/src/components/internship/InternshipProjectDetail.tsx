// components/internship/InternshipProjectDetail.tsx
'use client';

import { InternshipProject } from '@/library/internship-types';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, Code, GitBranch, Users } from 'lucide-react';
import Link from 'next/link';
import ArchitectureDiagram from './ArchitectureDiagram';
import CodeSamples from './CodeSamples';

interface InternshipProjectDetailProps {
  project: InternshipProject;
}

export default function InternshipProjectDetail({ project }: InternshipProjectDetailProps) {
  return (
    <main className="min-h-screen">
      {/* Back Button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/internship"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Internship Overview
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-blue-900 via-purple-900 to-blue-900 text-white relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-20">
          <motion.div
            className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"
            animate={{
              y: [0, 50, 0],
              x: [0, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"
            animate={{
              y: [0, -50, 0],
              x: [0, -30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                {project.title}
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                {project.description}
              </p>

              {/* Badges */}
              {project.badges && project.badges.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center mb-8">
                  {project.badges.map((badge, index) => (
                    <span
                      key={index}
                      className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        badge.color === 'blue'
                          ? 'bg-blue-500/20 text-blue-200 border border-blue-400/30'
                          : badge.color === 'green'
                          ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                          : badge.color === 'purple'
                          ? 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                          : 'bg-orange-500/20 text-orange-200 border border-orange-400/30'
                      }`}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              {project.stats && (
                <div className="flex flex-wrap gap-6 justify-center">
                  {project.stats.lines_of_code && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">{project.stats.lines_of_code}</div>
                      <div className="text-blue-200 text-sm">Lines of Code</div>
                    </div>
                  )}
                  {project.stats.test_files && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">{project.stats.test_files}</div>
                      <div className="text-blue-200 text-sm">Test Files</div>
                    </div>
                  )}
                  {project.stats.coverage && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">{project.stats.coverage}</div>
                      <div className="text-blue-200 text-sm">Test Coverage</div>
                    </div>
                  )}
                  {project.stats.ownership && (
                    <div className="text-center">
                      <div className="text-3xl font-bold">{project.stats.ownership}</div>
                      <div className="text-blue-200 text-sm">Code Ownership</div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Code className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h2 className="text-4xl font-bold dark:text-white">Overview</h2>
            </div>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {project.overview.split('\n\n').map((paragraph, index) => {
                // Parse bold text **text** -> <strong>text</strong>
                const parts: React.ReactNode[] = [];
                let remaining = paragraph;
                let key = 0;
                
                while (remaining.length > 0) {
                  const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
                  
                  if (boldMatch && boldMatch.index !== undefined) {
                    // Add text before the bold match
                    const textBefore = remaining.substring(0, boldMatch.index);
                    if (textBefore) parts.push(<span key={key++}>{textBefore}</span>);
                    
                    // Add the bold text
                    parts.push(<strong key={key++} className="font-bold">{boldMatch[1]}</strong>);
                    
                    // Continue with text after the bold match
                    remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
                  } else {
                    // No more bold matches, add remaining text
                    if (remaining) parts.push(<span key={key++}>{remaining}</span>);
                    break;
                  }
                }
                
                return (
                  <p key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                    {parts}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Role & Responsibilities */}
      {project.role_description && (
        <section className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h2 className="text-4xl font-bold dark:text-white">Role & Responsibilities</h2>
              </div>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {project.role_description}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Key Features */}
      {project.key_features && project.key_features.length > 0 && (
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <Award className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h2 className="text-4xl font-bold dark:text-white">Key Features</h2>
              </div>
              <ul className="space-y-4">
                {project.key_features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-2" />
                    <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                      {feature}
                    </p>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Technologies */}
      {project.tech_stack && project.tech_stack.length > 0 && (
        <section className="py-20 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <GitBranch className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h2 className="text-4xl font-bold dark:text-white">Technologies</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {project.tech_stack.map((tech, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm hover:scale-110 transition-transform"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Architecture Diagrams */}
      {project.architecture_diagrams && project.architecture_diagrams.length > 0 && (
        <div>
          {project.architecture_diagrams.map((diagram, index) => (
            <ArchitectureDiagram
              key={index}
              diagram={diagram.diagram}
              title={diagram.title}
              description={diagram.description}
            />
          ))}
        </div>
      )}

      {/* Code Samples */}
      {project.code_samples && project.code_samples.length > 0 && (
        <CodeSamples samples={project.code_samples} />
      )}

      {/* Impact Metrics */}
      {project.impact_metrics && 
       project.impact_metrics.security_vulnerabilities_prevented && 
       project.impact_metrics.reusability_score && 
       project.impact_metrics.code_quality_rating && (
        <section className="py-20 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold mb-12 dark:text-white text-center">
                Impact & Results
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {project.impact_metrics.security_vulnerabilities_prevented}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Security Vulnerabilities Prevented
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {project.impact_metrics.reusability_score}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Reusability Score
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {project.impact_metrics.code_quality_rating}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Code Quality Rating
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
