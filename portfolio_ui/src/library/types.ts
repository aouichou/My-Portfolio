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
  development_steps?: DevelopmentStep[];
  code_snippet?: string;
  styles_snippet?: string;
  diagram_type?: string;
  has_interactive_demo: boolean;
  demo_files_path?: string;
  demo_commands?: Record<string, string>;
  code_steps?: Record<string, string | number | boolean | object>;
  code_snippets?: Record<string, string | CodeSnippet>;
  
  // Unified project type fields
  project_type: 'school' | 'internship';
  
  // Internship-specific fields
  company?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  stats?: Record<string, string>;
  badges?: Array<{ text: string; color: string }>;
  role_description?: string;
  impact_metrics?: {
    security_vulnerabilities_prevented?: string;
    reusability_score?: string;
    code_quality_rating?: string;
  };
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