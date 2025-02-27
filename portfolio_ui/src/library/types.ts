// library/types.ts

// types.ts
export type ProjectImage = {
	image: string;
	caption?: string;
	order?: number;
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
	gallery: ProjectImage[];
	architecture_diagram: string;
	video_url?: string;
	thumbnail: string;
	live_url?: string;
	code_url?: string;
  };