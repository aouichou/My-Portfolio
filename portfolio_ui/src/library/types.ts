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
  
  export type Project = {
	id: string;
	title: string;
	slug: string;
	description: string;
	tech_stack: string[];
	features: string[];
	challenges: string;
	lessons: string;
	galleries: Gallery[];
	architecture_diagram: string;
	thumbnail: string;
	live_url?: string;
	code_url?: string;
  };