// src/lib/api-client.ts

import axios from "axios";
import { getMediaUrl, S3_BUCKET_URL } from './s3-config';
import { Project } from "./types";

// Re-export from s3-config
export { getMediaUrl, S3_BUCKET_URL };

// Determine API URL based on environment
// For server-side: use SERVER_API_URL (Docker internal) or NEXT_PUBLIC_API_URL
// For client-side: use NEXT_PUBLIC_API_URL (accessible from browser)
const getApiUrl = () => {
  // Server-side rendering (Node.js)
  if (typeof window === 'undefined') {
    const url = (process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api').replace(/\/$/, '');
    return url;
  }
  // Client-side (browser) - detect localhost
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    return 'http://localhost:8000/api';
  }
  const url = (process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api').replace(/\/$/, '');
  return url;
};

// Single source of truth for API URL with NO trailing slash
export const API_URL = getApiUrl();

// Create axios instance
export const api = axios.create({ 
  baseURL: API_URL,
  headers: {
	'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '') || 
						'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

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
export const fetchWithTimeout = async (url: string, options = {}, timeout = 10000) => {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeout);
	
	try {
	  const response = await fetch(url, {
		...options,
		signal: controller.signal
	  });
	  
	  clearTimeout(id);
	  
	  if (!response.ok) {
		throw new Error(`Network response was not ok: ${response.status}`);
	  }
	  
	  return response;
	} catch (error) {
	  clearTimeout(id);
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