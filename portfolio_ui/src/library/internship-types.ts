// library/internship-types.ts
// TypeScript interfaces matching Django backend internship models

export interface InternshipCodeSample {
  title: string;
  description: string;
  code: string;
  language: string;
  highlights?: string[];
}

export interface InternshipDocumentation {
  title: string;
  description: string;
  url?: string;
  category?: string;
}

export interface InternshipStats {
  lines_of_code?: string;
  test_coverage?: string;
  apis_developed?: string;
  test_files?: string;
  documentation_pages?: string;
}

export interface InternshipImpactMetrics {
  zero_trust_architecture?: string;
  reusability?: string;
  security?: string;
  testing?: string;
  code_quality?: string;
}

export interface Internship {
  id: number;
  company: string;
  role: string;
  subtitle: string;
  slug: string;
  start_date: string; // ISO date string
  end_date: string;   // ISO date string
  overview: string;
  stats: InternshipStats;
  technologies: string[];
  impact_metrics: InternshipImpactMetrics;
  architecture_description: string;
  architecture_diagram: string; // Mermaid code
  code_samples: InternshipCodeSample[];
  documentation: InternshipDocumentation[];
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  // Nested projects from serializer
  projects?: InternshipProject[];
}

export interface InternshipProjectStats {
  ownership?: string;
  lines_of_code?: string;
  test_coverage?: string;
  adoption?: string;
  reusability?: string;
  static_analysis?: string;
}

export interface InternshipProjectBadge {
  text: string;
  variant?: 'primary' | 'purple' | 'green' | 'blue';
}

export interface InternshipProject {
  id: number;
  internship: number; // FK to internship
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  thumbnail_url?: string;
  overview: string;
  role_description: string;
  tech_stack: string[];
  stats: InternshipProjectStats;
  badges: InternshipProjectBadge[];
  architecture_description?: string;
  architecture_diagrams: Array<{
    title: string;
    diagram: string;
    description?: string;
  }>;
  key_features: string[];
  code_snippets: InternshipCodeSample[];
  impact_metrics?: {
    security_vulnerabilities_prevented?: string;
    reusability_score?: string;
    code_quality_rating?: string;
  };
  related_documentation: string[];
  order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// For API responses
export interface InternshipListResponse {
  results: Internship[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Helper type for tech stack with categories
export interface Technology {
  name: string;
  icon?: string;
  category: 'backend' | 'frontend' | 'security' | 'devops' | 'observability' | 'database' | 'all';
  level?: 1 | 2 | 3 | 4 | 5; // Proficiency stars
}
