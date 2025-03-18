// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import { getProjects, getProjectBySlug as apiGetProjectBySlug } from './api-client';
import { normalizeProject } from './utils';
import { Project } from './types';

export function useFeaturedProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const projects = await getProjects();
      return projects.map(normalizeProject);
    }
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
	queryKey: ['projects'],
	queryFn: async () => {
	  const projects = await getProjects();
	  return projects.map(normalizeProject);
	}
  });
}

export async function getAllProjects() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const res = await fetch(`${apiUrl}/api/projects/`, {
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