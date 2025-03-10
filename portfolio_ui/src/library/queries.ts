// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';
import type { Project } from './types';

export const useFeaturedProjects = () => {
	return useQuery<Project[]>({
	  queryKey: ['projects'],
	  queryFn: async () => {
		try {
		  const { data } = await api.get('/projects/');
		  return data;
		} catch (error) {
		  throw new Error('Failed to load projects. Please refresh the page.');
		}
	  },
	  retry: 2,
	  retryDelay: 1000
	});
  };