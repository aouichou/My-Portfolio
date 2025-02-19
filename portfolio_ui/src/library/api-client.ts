// src/lib/api-client.ts

import axios from "axios"

const baseURL = typeof window === "undefined"
  ? "http://backend:8080/api"  // server-side calls
  : "/api";                    // client-side rewrites

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

export const mediaURL = typeof window === "undefined" 
  ? "http://reverse-proxy/media"  // 👈 Server-side through proxy
  : "/media";  // Client-side relative path

export async function getProjectBySlug(slug: string) {
  try {
    const response = await api.get(`/projects/${slug}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
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