// portfolio_ui/src/app/projects/page.tsx

import ProjectsGrid from '@/components/ProjectsGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Projects | My Portfolio',
  description: 'Browse all my projects and experiments',
};

// Mark the page as dynamically rendered to prevent build-time API issues
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  try {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">All Projects</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-12 max-w-3xl mx-auto">
          A comprehensive collection of all my work, from web applications to low-level systems programming
        </p>
        
        <ProjectsGrid showAll={true} />
      </div>
    );
  } catch (error) {
    // Return a fallback UI when API isn't available during build
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-center">All Projects</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 text-center mb-12 max-w-3xl mx-auto">
          A comprehensive collection of all my work, from web applications to low-level systems programming
        </p>
        
        <ProjectsGrid showAll={true} />
      </div>
    );
  }
}