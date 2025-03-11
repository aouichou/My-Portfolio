// src/components/ProjectsGrid.tsx

'use client';

import { useFeaturedProjects } from '../library/queries';
import Link from 'next/link';
import ClientImage from './ClientImage';
import { useEffect } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import { Project } from '../library/types';

export default function ProjectsGrid() {
  const { data: projects, isLoading, error } = useFeaturedProjects();

  // Only log in development, not production
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      console.log("Projects data:", projects);
    }, [projects]);
  }

  if (error) return <div className="py-20 text-center">Failed to load projects. Please try again later.</div>;
  if (isLoading) return <LoadingSkeleton />;

  return (
    <section id="projects" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center dark:text-white">
          Featured Work
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects?.map((project: Project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-48 w-full">
                <ClientImage
                  src={project.thumbnail_url || project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3 dark:text-white">
                  {project.title}
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech_stack?.map((tech: string) => (
                    <span key={tech} className="badge-tech">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (project.live_url) window.open(project.live_url, '_blank');
                    }}
                    className="btn-primary-sm"
                    disabled={!project.live_url}
                  >
                    Live Demo
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (project.code_url) window.open(project.code_url, '_blank');
                    }}
                    className="btn-outline-sm"
                    disabled={!project.code_url}
                  >
                    Source Code
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}