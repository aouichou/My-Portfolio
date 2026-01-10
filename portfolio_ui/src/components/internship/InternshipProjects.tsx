// components/internship/InternshipProjects.tsx
'use client';

import type { InternshipProject } from '@/library/internship-types';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface InternshipProjectsProps {
  projects: InternshipProject[];
  internshipSlug: string;
}

export default function InternshipProjects({ projects, internshipSlug }: InternshipProjectsProps) {
  return (
    <section id="projects" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-bold mb-4 dark:text-white">
            Key Projects
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Production systems built with modern architecture and enterprise-grade quality
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -10 }}
              className="relative group"
            >
              <Link href={`/internship/${project.slug}`} className="block h-full">
                {/* Gradient Border Wrapper */}
                <div className="p-[2px] bg-linear-to-r from-blue-600 to-purple-600 rounded-xl h-full">
                  <div className="bg-white dark:bg-gray-800 rounded-xl h-full overflow-hidden flex flex-col">
                    {/* Thumbnail */}
                    <div className="relative h-48 w-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex-shrink-0">
                    {project.thumbnail_url ? (
                      <Image
                        src={project.thumbnail_url}
                        alt={project.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-6xl">
                          {project.title.includes('Clinical') && '📊'}
                          {project.title.includes('Keycloak') && '🔐'}
                          {project.title.includes('Patient') && '🏥'}
                        </div>
                      </div>
                    )}
                    
                    {/* Badges Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      {project.is_featured && (
                        <span className="px-3 py-1 bg-linear-to-r from-blue-600 to-purple-600 text-white text-xs font-semibold rounded-full shadow-lg">
                          Featured
                        </span>
                      )}
                      {project.badges && project.badges.map((badge, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 text-white text-xs font-semibold rounded-full shadow-lg ${
                            badge.variant === 'green' 
                              ? 'bg-green-600' 
                              : badge.variant === 'purple'
                              ? 'bg-purple-600'
                              : 'bg-blue-600'
                          }`}
                        >
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold mb-3 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {project.title}
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 flex-1">
                      {project.description}
                    </p>

                    {/* Stats */}
                    {project.stats && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        {project.stats.ownership && (
                          <span className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                            {project.stats.ownership} ownership
                          </span>
                        )}
                        {project.stats.lines_of_code && (
                          <span className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                            {project.stats.lines_of_code} LOC
                          </span>
                        )}
                        {project.stats.adoption && (
                          <span className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                            {project.stats.adoption}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {project.tech_stack.slice(0, 4).map((tech, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.tech_stack.length > 4 && (
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          +{project.tech_stack.length - 4}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
