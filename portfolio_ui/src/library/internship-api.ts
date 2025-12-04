// library/internship-api.ts
// API client functions for internship data

import api from './api-client';
import { Internship, InternshipProject } from './internship-types';

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
    // Use SERVER_API_URL for server-side (Docker internal) or fallback to NEXT_PUBLIC_API_URL
    const apiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api';
    const res = await fetch(`${apiUrl}/internships/`, {
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
  try {
    // Use SERVER_API_URL for server-side (Docker internal) or fallback to NEXT_PUBLIC_API_URL
    const apiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api';
    const res = await fetch(`${apiUrl}/internships/${slug}/`, {
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
  try {
    // Use SERVER_API_URL for server-side (Docker internal) or fallback to NEXT_PUBLIC_API_URL
    const apiUrl = process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api';
    const res = await fetch(`${apiUrl}/internships/${internshipSlug}/projects/${projectSlug}/`, {
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

