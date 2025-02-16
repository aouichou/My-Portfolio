// src/lib/types.ts

export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  tech_stack: string[];
  live_url?: string;
  code_url?: string;
  readme: string;
  score?: number;
}