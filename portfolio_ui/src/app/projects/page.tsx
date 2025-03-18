// portfolio_ui/src/app/projects/page.tsx

import { Metadata } from 'next';
import ProjectsGrid  from '@/components/ProjectsGrid';

export const metadata: Metadata = {
  title: 'All Projects | Portfolio',
  description: 'Browse all my projects and work samples',
};

export default function AllProjectsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-5xl font-bold mb-12">All Projects</h1>
        <ProjectsGrid showAll={true} />
      </div>
    </div>
  );
}