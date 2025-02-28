// src/components/ProjectsGrid.tsx

'use client';

import { useFeaturedProjects } from '../library/queries';
import Link from 'next/link';
import ClientImage from './ClientImage';
import { useEffect, useState } from 'react';
import ErrorBoundary from './error/boundary';
import LoadingSkeleton from './LoadingSkeleton';

export default function ProjectsGrid() {
	const [isMounted, setIsMounted] = useState(false);
	const { data: projects, isLoading, error } = useFeaturedProjects();

	if (error) return <ErrorBoundary error={error} reset={() => window.location.reload()} />;
	if (isLoading) return <LoadingSkeleton />;
  
	useEffect(() => {
	  setIsMounted(true);
	}, []);

  return (
    <section id="projects" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center dark:text-white">
          Featured Work
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              {<ClientImage
                src={project.thumbnail}
                alt={project.title}
                width={600}
                height={400}
                className="w-full h-48 object-cover"
                priority={true}
                placeholder="blur"
                blurDataURL="/placeholder.jpg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/fallback-image.jpg";
                }}
				unoptimized
              />
			  }
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
                      window.open(project.live_url, '_blank');
                    }}
                    className="btn-primary-sm"
                  >
                    Live Demo
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(project.code_url, '_blank');
                    }}
                    className="btn-outline-sm"
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