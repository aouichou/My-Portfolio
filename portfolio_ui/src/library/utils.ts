// library/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Project, Gallery, GalleryImage } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility function to normalize project data
export function normalizeProject(project: any): Project {
  const normalized = {...project};
  
  // Ensure thumbnail is available via both properties
  if (normalized.thumbnail_url && !normalized.thumbnail) {
    normalized.thumbnail = normalized.thumbnail_url;
  } else if (normalized.thumbnail && !normalized.thumbnail_url) {
    normalized.thumbnail_url = normalized.thumbnail;
  }
  
  // Normalize galleries structure if needed
  if (normalized.galleries && Array.isArray(normalized.galleries)) {
    normalized.galleries = normalized.galleries.map((gallery: any): Gallery => {
      // Handle different API response formats
      if (gallery.image_url && !gallery.images) {
        // Convert old format to new format
        return {
          name: gallery.name || 'Gallery',
          description: gallery.description || '',
          images: [{
            image: gallery.image_url,
            caption: gallery.caption || ''
          }]
        };
      }
      return gallery;
    });
  }
  
  return normalized as Project;
}