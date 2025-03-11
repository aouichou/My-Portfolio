"use client";

import { useEffect } from 'react';
import { useFeaturedProjects } from '../library/queries';

export default function ProjectsDebug() {
  const { data: projects } = useFeaturedProjects();

  useEffect(() => {
    if (projects && projects.length > 0) {
      console.log('Project data received:');
      console.log('First project:', projects[0]);
      console.log('Thumbnail URL:', projects[0].thumbnail);
      
      // Test direct fetch of the first image
      if (projects[0].thumbnail) {
        const img = new Image();
        img.src = projects[0].thumbnail;
        img.onload = () => console.log('Direct thumbnail load successful!');
        img.onerror = () => console.error('Direct thumbnail load failed!');
      }
    }
  }, [projects]);

  return null;
}