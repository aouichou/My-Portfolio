// src/components/ProjectsGrid.tsx

'use client';

import Link from 'next/link';
import ClientImage from './ClientImage';
import { useEffect } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import { Project } from '../library/types';
import { useFeaturedProjects, useAllProjects } from '../library/queries';
import { motion } from 'framer-motion';

export default function ProjectsGrid({ showAll = false }) {
    // const { data: featuredProjects, isLoading: featuredLoading, error: featuredError } = useFeaturedProjects();
    // const { data: allProjects, isLoading: allLoading, error: allError } = useAllProjects();
	const { isLoading, error } = useFeaturedProjects();
	
	console.log(`ProjectsGrid hydration - showAll=${showAll}`);

	// Force correct query based on showAll prop
	const { data: featuredProjects, isLoading: featuredLoading, error: featuredError } = 
	  useFeaturedProjects();
	
	const { data: allProjects, isLoading: allLoading, error: allError } = 
	  useAllProjects({ enabled: showAll });
	  
	// Force the correct data set based on showAll
	const projects = showAll 
	  ? allProjects 
	  : featuredProjects;

  // Only log in development, not production
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      console.log("Projects data:", projects);
    }, [projects]);
  }

  if (error) return <div className="py-20 text-center">Failed to load projects. Please try again later.</div>;
  if (isLoading) {
    return <LoadingSkeleton />; // Show loading skeleton
  }

  // Instead of returning undefined, return a message if no projects
  if (!projects || projects.length === 0) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-2xl font-bold">No projects found</h3>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Projects will appear here once they're available.</p>
      </div>
    );
  }

  return (
    <section id="projects" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center dark:text-white">
          {showAll ? 'All Projects' : 'Featured Work'}
        </h2>
        <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects?.map((project: Project, index: number) => (
            <motion.div
              key={project.id || `project-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.1, 0.5) }} // Cap delay at 0.5s
              whileHover={{ 
                y: -10, 
                scale: 1.03,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
            >
			<Link
				href={`/projects/${project.slug}`}
				className="block h-full"
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
                    e.stopPropagation(); // Prevent event bubbling
                    try {
                      if (project.has_interactive_demo) {
                        window.location.href = `/demo/${project.slug}`;
                      } else if (project.live_url) {
                        window.open(project.live_url, '_blank', 'noopener,noreferrer');
                      }
                    } catch (error) {
                      console.error("Navigation error:", error);
                      // Show a toast notification instead
                      if (window.toast) {
                        window.toast.error("Couldn't open demo. Please try again.");
                      }
                    }
                  }}
                  className="btn-primary-sm"
                  disabled={!project.live_url && !project.has_interactive_demo}
                >
                  {project.has_interactive_demo ? 'Try Demo' : 'Live Demo'}
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
		  </motion.div>
          ))}
        </div>

		{!showAll && (
          <div className="mt-16 text-center">
            <Link href="/projects" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              View All Projects
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}