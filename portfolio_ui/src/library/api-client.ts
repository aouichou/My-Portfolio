// src/lib/api-client.ts

import axios from "axios"
import { EMPTY_PROJECT, Project } from "./types"
import { getMediaUrl, S3_BUCKET_URL } from './s3-config';

// Re-export from s3-config
export { getMediaUrl, S3_BUCKET_URL };

// Single source of truth for API URL with NO trailing slash
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 
                      'https://api.aouichou.me/api'; // Use api.aouichou.me instead of portfolio-backend-dytv.onrender.com

					  // Create axios instance
export const api = axios.create({ 
  baseURL: API_URL,
  headers: {
	'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000, // 15 seconds timeout
  timeoutErrorMessage: 'Request timed out. Please try again.',
});

export const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/$/, '') || 
						'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

export async function getProjectBySlug(slug: string, attempt = 0): Promise<Project> {
  try {
	const response = await api.get<Project>(`/projects/${slug}/`);
	return {
		...EMPTY_PROJECT,
		...response.data,
		galleries: response.data.galleries || [],
		tech_stack: response.data.tech_stack || []
	};
  } catch (error) {
	if (axios.isAxiosError(error) && error.code === 'ECONNABORTED' && attempt < MAX_RETRIES) {
	  console.warn(`Request timed out, retrying (${attempt+1}/${MAX_RETRIES})...`);
	  await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
	  return getProjectBySlug(slug, attempt + 1);
	}
	console.error('Error fetching project:', error);
	throw new Error('Failed to fetch project details');
  }
}

export async function getProjects() {
  try {
	const response = await api.get('/projects/');
	return response.data;
  } catch (error) {
	console.error('Error fetching projects:', error);
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