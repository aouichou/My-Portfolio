// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import api, { getProjectBySlug as apiGetProjectBySlug, getFeaturedProjects } from './api-client';
import { CodeSnippet, Project } from './types';
import { normalizeProject } from './utils';

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
  code_steps?: Record<string, string | number | boolean | object>;
  code_snippets?: Record<string, string | CodeSnippet>;
  
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
		// Fetch 3 school + 3 internship featured projects
		const projects = await getFeaturedProjects({ school: 3, internship: 3 });
		return projects.map(normalizeProject);
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

export function useAllProjects(options = {}) {
  return useQuery({
    queryKey: ['allProjects'],
    queryFn: async () => {
      // Use a direct API call to ensure the parameter is sent
      try {
        const response = await api.get('/projects/?include_all=true');
        return response.data.map(normalizeProject);
      } catch (error) {
        console.error('Error in useAllProjects:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    ...options
  });
}

export async function getAllProjects() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api'; // Use same base as api-client
    const res = await fetch(`${apiUrl}/projects/?include_all=true`, {
      next: { revalidate: 60 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.warn('API returned error status', res.status);
      return []; // Return empty array instead of throwing
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return []; // Return empty array on error
  }
}