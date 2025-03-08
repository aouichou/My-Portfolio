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

// Add interceptor to ensure trailing slashes for Django compatibility
api.interceptors.request.use(config => {
  if (config.url && !config.url.endsWith('/')) {
    config.url = `${config.url}/`;
  }
  return config;
});

// Single source of truth for Media URL
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

// Keep only one implementation of getProjects
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
  if (!path) return "/placeholder.svg";
  if (path.startsWith("http")) return path;
  
  const base = MEDIA_URL;
  return `${base}/${path.replace(/^\//, '')}`;
}