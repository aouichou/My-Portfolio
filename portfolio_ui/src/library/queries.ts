// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import { getProjects, getProjectBySlug as apiGetProjectBySlug } from './api-client';
import { normalizeProject } from './utils';

export function useFeaturedProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const projects = await getProjects();
      return projects.map(normalizeProject);
    }
  });
}

export function useProjectBySlug(slug: string | null) {
  return useQuery({
    queryKey: ['projects', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      const project = await apiGetProjectBySlug(slug);
      return normalizeProject(project);
    },
    enabled: !!slug
  });
}