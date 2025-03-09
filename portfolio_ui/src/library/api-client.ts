// src/lib/api-client.ts

import axios from "axios"
import { Project } from "./types"

const baseURL = process.env.NEXT_PUBLIC_API_URL || "https://api.aouichou.me/api";

export const api = axios.create({ baseURL });

export const mediaURL = typeof window === "undefined" 
  ? "http://reverse-proxy/media"  // 👈 Server-side through proxy
  : "/media";  // Client-side relative path

  export async function getProjectBySlug(slug: string): Promise<Project> {
	try {
	  const response = await api.get<Project>(`/projects/${slug}/`);
	  return response.data;
	} catch (error) {
	  console.error('Error fetching project:', error);
	  throw new Error('Failed to fetch project details');
	}
  }
  
// Ensure this function works during build time (SSG)
export async function getProjects() {
	// Always use client-side URL for static exports
	const api = axios.create({
	  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api"
	});
  
	try {
	  const response = await api.get('/projects/');
	  return response.data;
	} catch (error) {
	  console.error('Error fetching projects:', error);
	  return [];
	}
  }


export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.aouichou.me/api';
export const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || 'https://api.aouichou.me/media';

const apiClient = axios.create({
	baseURL: API_URL,
	headers: {
		'Content-Type': 'application/json',
	}
});

export default apiClient;

export async function fetchFromAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error("API request error:", error)
    throw error
  }
}

export function getMediaUrl(path: string): string {
	if (!path) return "/placeholder.svg";
	if (path.startsWith("http")) return path;
	
	// Preserve media prefix for Kubernetes
	return `${MEDIA_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }