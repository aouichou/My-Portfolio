// library/internship-api.ts
// API client functions for internship data

import api from './api-client';
import { Internship, InternshipProject } from './internship-types';
import { buildApiUrl, getConfiguredApiBaseUrl } from './url-security';

const SAFE_SLUG = /^[a-zA-Z0-9_-]+$/;

function assertSafeSlug(slug: string): void {
  if (!SAFE_SLUG.test(slug)) {
    throw new Error(`Invalid slug: ${slug}`);
  }
}

/**
 * Fetch all internships
 */
export async function getInternships(): Promise<Internship[]> {
  try {
    const response = await api.get<Internship[]>('/internships/');
    return response.data;
  } catch (error) {
    console.error('Error fetching internships:', error);
    return [];
  }
}

/**
 * Fetch a single internship by slug (includes nested projects)
 */
export async function getInternshipBySlug(slug: string): Promise<Internship> {
  try {
    const response = await api.get<Internship>(`/internships/${slug}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching internship:', error);
    throw new Error('Failed to fetch internship details');
  }
}

/**
 * Fetch projects for a specific internship
 */
export async function getInternshipProjects(internshipSlug: string): Promise<InternshipProject[]> {
  try {
    const response = await api.get<InternshipProject[]>(`/internships/${internshipSlug}/projects/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching internship projects:', error);
    return [];
  }
}

/**
 * Fetch a single internship project by slugs
 */
export async function getInternshipProject(
  internshipSlug: string,
  projectSlug: string
): Promise<InternshipProject> {
  try {
    const response = await api.get<InternshipProject>(
      `/internships/${internshipSlug}/projects/${projectSlug}/`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching internship project:', error);
    throw new Error('Failed to fetch project details');
  }
}

/**
 * Server-side fetch for internships (Next.js Server Components)
 */
export async function getAllInternships() {
  try {
    const res = await fetch(buildApiUrl(['internships']), {
      next: { revalidate: 60 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.warn('API returned error status', res.status);
      return [];
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch internships:', error);
    return [];
  }
}

/**
 * Server-side fetch for single internship (Next.js Server Components)
 */
export async function fetchInternshipBySlug(slug: string) {
  assertSafeSlug(slug);
  try {
    const res = await fetch(buildApiUrl(['internships', slug]), {
      next: { revalidate: 60 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch internship ${slug}:`, res.status, res.statusText);
      return null;
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch internship:', error);
    return null;
  }
}

/**
 * Server-side fetch for single internship project (Next.js Server Components)
 */
export async function fetchInternshipProject(internshipSlug: string, projectSlug: string) {
  assertSafeSlug(internshipSlug);
  assertSafeSlug(projectSlug);
  // Build URL from trusted base and encode path segments, then verify origin
  const endpoint = new URL(buildApiUrl(['internships', internshipSlug, 'projects', projectSlug]));
  const trustedOrigin = new URL(getConfiguredApiBaseUrl()).origin;
  if (endpoint.origin !== trustedOrigin) {
    throw new Error('Untrusted API origin');
  }
  try {
    const res = await fetch(endpoint.href, {
      next: { revalidate: 60 },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch project ${projectSlug}:`, res.status, res.statusText);
      return null;
    }
    
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch internship project:', error);
    return null;
  }
}

