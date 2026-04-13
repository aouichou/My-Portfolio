// src/lib/api-client.ts

import axios from "axios";
import { getMediaUrl, S3_BUCKET_URL } from './s3-config';
import { Project } from "./types";
import { buildApiUrl, ensureSafeApiUrl, getConfiguredApiBaseUrl } from './url-security';

// Re-export from s3-config
export { getMediaUrl, S3_BUCKET_URL };

// Single source of truth for API URL with NO trailing slash
export const API_URL = getConfiguredApiBaseUrl();

// Create axios instance
export const api = axios.create({ 
  baseURL: API_URL,
  headers: {
	'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '') || 
						'https://media.aouichou.me';

export async function getProjectBySlug(slug: string): Promise<Project> {
  try {
	// Will get transformed to `/projects/minirt/` by the interceptor
	const response = await api.get<Project>(`/projects/${slug}`);
	return response.data;
  } catch (error) {
	console.error('Error fetching project:', error);
	throw new Error('Failed to fetch project details');
  }
}

export async function getProjects(projectType?: 'school' | 'internship') {
  try {
	const params = projectType ? { project_type: projectType } : {};
	const response = await api.get('/projects/', { params });
	return response.data;
  } catch (error) {
	console.error('Error fetching projects:', error);
	return [];
  }
}

export async function getFeaturedProjects(limit?: { school?: number; internship?: number }) {
  try {
	// Fetch featured school projects
	const schoolPromise = api.get('/projects/', { 
	  params: { project_type: 'school', is_featured: true } 
	});
	
	// Fetch featured internship projects
	const internshipPromise = api.get('/projects/', { 
	  params: { project_type: 'internship', is_featured: true } 
	});
	
	const [schoolResponse, internshipResponse] = await Promise.all([
	  schoolPromise,
	  internshipPromise
	]);
	
	const schoolProjects = schoolResponse.data.slice(0, limit?.school ?? 3);
	const internshipProjects = internshipResponse.data.slice(0, limit?.internship ?? 3);
	
	// Interleave projects: school, internship, school, internship, etc.
	const result: Project[] = [];
	const maxLength = Math.max(schoolProjects.length, internshipProjects.length);
	
	for (let i = 0; i < maxLength; i++) {
	  if (schoolProjects[i]) result.push(schoolProjects[i]);
	  if (internshipProjects[i]) result.push(internshipProjects[i]);
	}
	
	return result;
  } catch (error) {
	console.error('Error fetching featured projects:', error);
	return [];
  }
}

// response interceptor to handle 404s
api.interceptors.response.use(
	response => response,
	error => {
	  if (typeof window !== 'undefined' && error.response?.status === 404) {
		window.location.href = '/404';
	  }
	  return Promise.reject(error);
	}
  );

export default api;


// Helper for better error handling in network requests
// SECURITY: All URLs are validated against allowed API origins before fetching
export const fetchWithTimeout = async (url: string, options = {}, timeout = 10000) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => { controller.abort(); }, timeout);

	// Validate and normalize URL to prevent SSRF
	let safeUrl: string;
	if (url.startsWith('http://') || url.startsWith('https://')) {
	  safeUrl = ensureSafeApiUrl(url); // throws if origin/path mismatch
	} else {
	  // Relative path — build from trusted base URL
	  const segments = url.split('/').filter(Boolean);
	  safeUrl = buildApiUrl(segments);
	}
	
	// Inline origin verification for SSRF protection
	const parsedSafeUrl = new URL(safeUrl);
	const trustedOrigin = new URL(getConfiguredApiBaseUrl()).origin;
	if (parsedSafeUrl.origin !== trustedOrigin) {
	  throw new Error('SSRF: URL origin mismatch');
	}

	try {
	  const response = await fetch(parsedSafeUrl.href, {
		...options,
		signal: controller.signal
	  });
	  
	  clearTimeout(timeoutId);
	  
	  if (!response.ok) {
		throw new Error(`Network response was not ok: ${response.status}`);
	  }
	  
	  return response;
	} catch (error) {
	  clearTimeout(timeoutId);
	  throw error;
	}
  };

api.interceptors.request.use(config => {
  if (config.url) {
    // Split URL into base and query parts to preserve query parameters
    const [base, query] = config.url.split('?');
    
    // Add trailing slash to base if needed
    const newBase = base.endsWith('/') ? base : `${base}/`;
    
    // Reconstruct URL with query parameters preserved
    config.url = query ? `${newBase}?${query}` : newBase;
  }
  return config;
});

export async function getAllProjectsUnfiltered() {
  try {
    const response = await api.get('/projects/', {
      params: { include_all: true }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all projects:', error);
    return [];
  }
}