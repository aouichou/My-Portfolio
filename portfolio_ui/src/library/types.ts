// library/types.ts

export type GalleryImage = {
	image: string;
	caption?: string;
	order?: number;
  };
  
  export type Gallery = {
	name: string;
	description?: string;
	images: GalleryImage[];
  };
  
  export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  tech_stack: string[];
  features: string[];
  challenges: string;
  lessons: string;
  code_url: string;
  live_url: string;
  readme: string;
  score: number;
  is_featured: boolean;
  galleries?: Gallery[];
  thumbnail_url?: string;
  thumbnail?: string;
  video_url?: string;
  architecture_diagram?: string;
}