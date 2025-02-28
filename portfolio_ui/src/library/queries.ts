// src/lib/queries.ts

import { useQuery } from '@tanstack/react-query';
import { api } from './api-client';
import type { Project } from './types';

export const useFeaturedProjects = () => {
  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects/');
      return data;
    },
  });
};