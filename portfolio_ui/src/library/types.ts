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
  
  export type DevelopmentStep = {
	title: string;
	description: string;
	date?: string;
  };

  export interface CodeSnippet {
	code: string;
	title: string;
	description: string;
	explanation: string;
	language: string;
  }
  export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  features: string[];
  challenges: string;
  lessons: string;
  code_url: string;
  live_url: string;
  readme: string;
  score: number;
  is_featured: boolean;
  galleries: Gallery[];
  tech_stack: string[];
  thumbnail_url?: string;
  thumbnail?: string;
  video_url?: string;
  architecture_diagram?: string;
  development_steps?: DevelopmentStep[];
  code_snippet?: string;
  styles_snippet?: string;
  diagram_type?: string;
  has_interactive_demo: boolean;
  demo_files_path?: string;
  demo_commands?: Record<string, string>;
  code_steps?: Record<string, string | number | boolean | object>;
  code_snippets?: Record<string, string | CodeSnippet>;
}

declare global {
	interface Window {
	  mermaid?: {
		initialize: (config: any) => void;
	  };
	  toast?: {
		error: (message: string) => void;
		success: (message: string) => void;
		info: (message: string) => void;
	  };
	}
  }

  export const EMPTY_PROJECT: Project = {
	id: 0,
	title: '',
	slug: '',
	description: '',
	tech_stack: [],
	features: [],
	challenges: '',
	lessons: '',
	code_url: '',
	live_url: '',
	readme: '',
	score: 0,
	is_featured: false,
	galleries: [],
	has_interactive_demo: false
  };