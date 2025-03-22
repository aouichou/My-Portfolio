// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import { getProjects, getProjectBySlug as apiGetProjectBySlug } from './api-client';
import { normalizeProject } from './utils';
import { Project } from './types';
import { getAllProjectsUnfiltered } from './api-client';

type ProjectFromAPI = {
  id: string | number;
  title: string;
  slug: string;
  description: string;
  is_featured: boolean;
  score: number;
  
  // Fields that may be null/undefined
  readme?: string;
  tech_stack: string[];
  features?: string[];
  challenges?: string;
  lessons?: string;
  live_url?: string;
  code_url?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  video_url?: string;
  architecture_diagram?: string;
  diagram_type?: string;
  
  // Interactive demo fields
  has_interactive_demo: boolean;
  demo_commands?: Record<string, string>;
  demo_files_path?: string;
  
  // Code details
  code_steps?: Record<string, string>;
  code_snippets?: Record<string, string>;
  
  // Galleries (complex nested structure)
  galleries?: Array<{
    id: number;
    name: string;
    description?: string;
    order: number;
    images: Array<{
      id: number;
      image: string;
      caption?: string;
      order: number;
      image_url?: string;
    }>;
  }>;
};

  export function useFeaturedProjects() {
	return useQuery({
	  queryKey: ['featuredProjects'],
	  queryFn: async () => {
		const projects: ProjectFromAPI[] = await getProjects();
		// Explicit type for 'p' parameter
		const featuredProjects = projects.filter((p: ProjectFromAPI) => p.is_featured);
		return featuredProjects.map(normalizeProject);
	  },
	  staleTime: 1000 * 60 * 5, // 5 minutes cache
	  refetchOnWindowFocus: false
	});
  }

export function useProjectBySlug(slug: string, initialData?: Project) {
  return useQuery({
    queryKey: ['projects', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const project = await apiGetProjectBySlug(slug);
      return normalizeProject(project);
    },
    initialData, // Use server-fetched data for initial render
    enabled: !!slug
  });
}

export function useAllProjects() {
	return useQuery({
	  queryKey: ['allProjects'],
	  queryFn: async () => {
		const projects: ProjectFromAPI[] = await getAllProjectsUnfiltered();
		return projects.map(normalizeProject);
	  },
	  staleTime: 1000 * 60 * 5,
	  refetchOnWindowFocus: false
	});
  }

  export async function getAllProjects() {
	try {
	  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
	  const res = await fetch(`${apiUrl}/api/projects/?include_all=true`, {
		next: { revalidate: 60 },
		headers: {
		  'Accept': 'application/json'
		}
	  });
	  
	  if (!res.ok) {
		console.warn('API returned error status', res.status);
		return []; // Return empty array instead of throwing
	  }
	  
	  return res.json();
	} catch (error) {
	  console.error('Failed to fetch projects:', error);
	  return []; // Return empty array on error
	}
  }