// src/lib/api-client.ts

import axios from "axios"
import { Project } from "./types"

// Single source of truth for API URL with NO trailing slash
export const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 
                      'https://portfolio-backend-dytv.onrender.com/api';

// Create axios instance
export const api = axios.create({ 
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

api.interceptors.request.use(config => {
  if (config.url && !config.url.endsWith('/')) {
    config.url = `${config.url}/`;
  }
  return config;
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

export async function getProjects() {
  try {
    const response = await api.get('/projects/');
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default api;

// Helper function for media URLs
export function getMediaUrl(path: string): string {
  if (!path) return "/fallback-image.jpg";
  
  // Handle case where path is already a full URL
  if (path.startsWith("http")) {
    // For S3 bucket images, use our proxy to avoid CORS issues
    if (path.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
      return `/api/image-proxy?url=${encodeURIComponent(path)}`;
    }
    return path;
  }
  
  // If it's a relative path, construct the URL with the base
  const base = MEDIA_URL;
  const fullPath = `${base}/${path.replace(/^\//, '')}`;
  
  // Use proxy for all S3 URLs
  return `/api/image-proxy?url=${encodeURIComponent(fullPath)}`;
}

// response interceptor to handle 404s
api.interceptors.response.use(response => response, error => {
	if (error.response?.status === 404) {
	  window.location.href = '/404';
	}
	return Promise.reject(error);
  });