// src/components/ProjectsGrid.tsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAllProjects, useFeaturedProjects } from '../library/queries';
import { Project } from '../library/types';
import ClientImage from './ClientImage';
import LoadingSkeleton from './LoadingSkeleton';

export default function ProjectsGrid({ showAll = false }) {

	// Force correct query based on showAll prop
	const { data: featuredProjects, isLoading: featuredLoading, error: featuredError } = 
	  useFeaturedProjects();
	
	const { data: allProjects, isLoading: allLoading, error: allError } = 
	  useAllProjects({ enabled: showAll });
	  
	// Force the correct data set based on showAll
	const projects = showAll 
	  ? allProjects 
	  : featuredProjects;

  if (showAll ? allError : featuredError) {
	return <div className="py-20 text-center">Failed to load projects. Please try again later.</div>;
  }
  
  if (showAll ? allLoading : featuredLoading) {
	return <LoadingSkeleton />;
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
          {projects?.map((project: Project, index: number) => {
			const isInternship = project.project_type === 'internship';
			
			return (
            <motion.div
			  key={project.id || `project-${index}`}
			  initial={{ opacity: 0, y: 20 }}
			  animate={{ opacity: 1, y: 0 }}
			  transition={{ duration: 0.3, delay: Math.min(index * 0.1, 0.5) }}
			  whileHover={{ 
				y: -10, 
				scale: 1.03,
				boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
			  }}
			  whileTap={{ scale: 0.98 }}
			  className={`
				rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all flex flex-col h-full
				${isInternship 
				  ? 'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border-2 border-blue-200 dark:border-blue-800' 
				  : 'bg-white dark:bg-gray-700'
				}
			  `}
			>
			  <Link
				href={isInternship ? `/internship/${project.slug}` : `/projects/${project.slug}`}
				className="flex flex-col h-full"
			  >
				<div className="relative h-48 w-full">
				  <ClientImage
					src={project.thumbnail_url || project.thumbnail}
					alt={project.title}
					className="w-full h-full object-cover"
				  />
				  {isInternship && (
					<div className="absolute top-3 right-3 flex flex-wrap gap-2">
					  {project.badges?.map((badge, idx) => (
						<span 
						  key={idx}
						  className={`
							px-3 py-1 rounded-full text-xs font-semibold
							${badge.color === 'blue' ? 'bg-blue-500 text-white' : ''}
							${badge.color === 'green' ? 'bg-green-500 text-white' : ''}
							${badge.color === 'purple' ? 'bg-purple-500 text-white' : ''}
							${badge.color === 'orange' ? 'bg-orange-500 text-white' : ''}
						  `}
						>
						  {badge.text}
						</span>
					  ))}
					</div>
				  )}
				</div>
				<div className="p-6 flex flex-col flex-grow">
				  {isInternship && project.company && (
					<div className="flex items-center gap-2 mb-2">
					  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
						{project.role} @ {project.company}
					  </span>
					</div>
				  )}
				  <h3 className="text-2xl font-bold mb-3 dark:text-white">
					{project.title}
				  </h3>
				  
				  {isInternship && project.stats && (
					<div className="grid grid-cols-2 gap-2 mb-4">
					  {Object.entries(project.stats).slice(0, 4).map(([key, value]) => (
						<div key={key} className="text-center">
						  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{value}</div>
						  <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
							{key.replace(/_/g, ' ')}
						  </div>
						</div>
					  ))}
					</div>
				  )}
				  
				  <div className="flex flex-wrap gap-2 mb-4">
					{project.tech_stack.slice(0, isInternship ? 6 : 8).map((tech: string) => (
					  <span 
						key={tech} 
						className={`
						  badge-tech
						  ${isInternship ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}
						`}
					  >
						{tech}
					  </span>
					))}
				  </div>
				  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
					{project.description.slice(0, 150)}...
				  </p>
				  <div className="flex-grow"></div>
				  <div className="flex gap-4 mt-4">
					{(project.has_interactive_demo || (project.live_url && project.slug === 'ft_transcendence')) && (
					  <button
						onClick={(e) => {
						  e.preventDefault();
					  e.stopPropagation();
					  try {
						if (project.has_interactive_demo) {
						  window.location.assign(`/demo/${project.slug}`);
						} else if (project.live_url && project.slug === 'ft_transcendence') {
							  window.open(project.live_url, '_blank', 'noopener,noreferrer');
							}
						  } catch (error) {
							console.error("Navigation error:", error);
						  }
						}}
						className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
					  >
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
						</svg>
						{project.has_interactive_demo ? 'Try Demo' : 'Live Site'}
					  </button>
					)}
					{project.code_url && (
					  <button
						onClick={(e) => {
						  e.preventDefault();
						  e.stopPropagation();
						  if (project.code_url) window.open(project.code_url, '_blank', 'noopener,noreferrer');
						}}
						className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
					  >
						<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
						</svg>
						Source
					  </button>
					)}
				  </div>
				</div>
			  </Link>
			</motion.div>
          )})}
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