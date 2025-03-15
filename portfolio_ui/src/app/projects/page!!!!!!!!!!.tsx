// // app/projects/page.tsx
// import { getAllProjects } from '@/library/api-client';
// import ProjectsGrid from '@/components/ProjectsGrid';

// export default async function AllProjectsPage() {
//   const projects = await getAllProjects();
  
//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
//       <div className="max-w-7xl mx-auto px-4 py-12">
//         <h1 className="text-5xl font-bold mb-12">All Projects</h1>
//         <div className="mb-8">
//           <SearchFilters />
//         </div>
//         <ProjectsGrid projects={projects} />
//       </div>
//     </div>
//   );
// }