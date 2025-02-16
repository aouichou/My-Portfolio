// src/lib/api-client.ts

import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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