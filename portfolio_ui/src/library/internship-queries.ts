// library/internship-queries.ts
// React Query hooks for internship data

import { useQuery } from '@tanstack/react-query';
import {
    getInternshipBySlug,
    getInternshipProject,
    getInternshipProjects,
    getInternships
} from './internship-api';
import { Internship, InternshipProject } from './internship-types';

/**
 * Hook to fetch all internships
 */
export function useInternships() {
  return useQuery({
    queryKey: ['internships'],
    queryFn: getInternships,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false
  });
}

/**
 * Hook to fetch a single internship by slug
 */
export function useInternship(slug: string, initialData?: Internship) {
  return useQuery({
    queryKey: ['internships', slug],
    queryFn: async () => {
      if (!slug) return null;
      return getInternshipBySlug(slug);
    },
    initialData,
    enabled: !!slug,
    staleTime: 1000 * 60 * 5
  });
}

/**
 * Hook to fetch projects for an internship
 */
export function useInternshipProjects(internshipSlug: string) {
  return useQuery({
    queryKey: ['internships', internshipSlug, 'projects'],
    queryFn: () => getInternshipProjects(internshipSlug),
    enabled: !!internshipSlug,
    staleTime: 1000 * 60 * 5
  });
}

/**
 * Hook to fetch a single internship project
 */
export function useInternshipProject(
  internshipSlug: string,
  projectSlug: string,
  initialData?: InternshipProject
) {
  return useQuery({
    queryKey: ['internships', internshipSlug, 'projects', projectSlug],
    queryFn: async () => {
      if (!internshipSlug || !projectSlug) return null;
      return getInternshipProject(internshipSlug, projectSlug);
    },
    initialData,
    enabled: !!internshipSlug && !!projectSlug,
    staleTime: 1000 * 60 * 5
  });
}
