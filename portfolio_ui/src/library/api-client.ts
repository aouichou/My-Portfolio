// src/lib/api-client.ts

import axios from "axios"
import { Project } from "./types"

const baseURL = typeof window === "undefined"
  ? "http://backend-service:8080/api"  // Kubernetes service name
  : process.env.NEXT_PUBLIC_API_URL || "/api";  // Client-side URL

export const api = axios.create({ baseURL });

export const mediaURL = typeof window === "undefined" 
  ? "http://reverse-proxy/media"  // 👈 Server-side through proxy
  : "/media";  // Client-side relative path

  export async function getProjectBySlug(slug: string): Promise<Project> {
	try {
	  const response = await api.get<Project>(`/v1/projects/${slug}/`);
	  return response.data;
	} catch (error) {
	  console.error('Error fetching project:', error);
	  throw new Error('Failed to fetch project details');
	}
  }
  
  export async function getProjects() {
	try {
	  const response = await api.get('/v1/projects/');
	  return response.data;
	} catch (error) {
	  console.error('Error fetching projects:', error);
	  return [];
	}
  }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api"
const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || "/media"

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