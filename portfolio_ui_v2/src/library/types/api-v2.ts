/**
 * API contract v2 — machine types (THE frozen contract, hand-derived).
 *
 * Source of truth: docs/designs/2026-10-05-api-contract-v2.md (FROZEN,
 * Batman countersigned 2026-10-05). Every shape below cites its section.
 * Cross-checked field-for-field against the implementing serializers in
 * portfolio_api/projects/serializers.py @ rework/v2 (F2-03, commit c3c2b0a).
 *
 * Post-freeze changes require an ADR-note amendment — never silent drift
 * (contract §0.5).
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Contract §1 query param — single value; invalid → 400. */
export type ProjectType = 'school' | 'internship' | 'personal';

/** Canonical tech/technology item — contract §3.1 / §3.5. */
export interface TechItem {
  name: string;
  category?: string;
}

/** Contract §3.3 stats: [{label, value}]. */
export interface Stat {
  label: string;
  value: string;
}

/** Contract §3.3 impact_metrics: [{label, value, description?}]. */
export interface ImpactMetric {
  label: string;
  value: string;
  description?: string;
}

/** Contract §3.3 architecture_diagrams (Experience §3.5 reuses the shape). */
export interface ArchitectureDiagram {
  title: string;
  type: 'mermaid' | 'flowchart' | 'custom';
  content: string;
  description?: string;
}

/** Contract §3.3 related_documentation / §3.5 documentation. */
export interface DocRef {
  title: string;
  description?: string;
  category?: string;
}

/** Contract §3.3 code_snippets. */
export interface CodeSnippet {
  title?: string;
  description?: string;
  language?: string;
  code: string;
}

/** Contract §3.3 code_steps: [str] — ordered steps. */
export type CodeStep = string;

/** Contract §3.3 demo_commands: [{label, command}] — the demo block. */
export interface DemoCommand {
  label: string;
  command: string;
}

/** Contract §3.3 badges: [{text}] — color/variant keys are gone (brief §2.5). */
export interface Badge {
  text: string;
}

/** Contract §3.3 galleries → images. */
export interface GalleryImage {
  image_url: string | null;
  caption: string;
  order: number;
}

/** Contract §3.3 galleries. */
export interface Gallery {
  name: string;
  description: string | null;
  order: number;
  images: GalleryImage[];
}

/** Contract §3.3 experience — the light ref (or null when unlinked). */
export interface ExperienceRef {
  slug: string;
  company: string;
  role: string;
  period_display: string;
}

// ---------------------------------------------------------------------------
// §3.1 ProjectCard — list items (#3) and nested projects (#7). 9 fields.
// ---------------------------------------------------------------------------

export interface ProjectCard {
  slug: string;
  title: string;
  project_type: ProjectType;
  description: string;
  is_featured: boolean;
  has_demo: boolean;
  /** §2.2 frozen fix: uploaded thumbnail URL, else external, else null. */
  thumbnail_url: string | null;
  tech_stack: TechItem[];
  order: number;
}

// ---------------------------------------------------------------------------
// §3.2 GET /api/projects/ envelope — limit/offset pagination (#3 only).
// ---------------------------------------------------------------------------

export interface PaginatedProjects {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProjectCard[];
}

/** Query params for #3 — the complete list (contract §1). */
export interface ProjectsListParams {
  project_type?: ProjectType;
  has_demo?: boolean;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// §3.3 ProjectDetail — GET /api/projects/{slug}/ (#4). 31 fields.
// ---------------------------------------------------------------------------

export interface ProjectDetail {
  slug: string;
  title: string;
  project_type: ProjectType;
  description: string;
  readme: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  score: number | null;
  tech_stack: TechItem[];
  features: string[];
  challenges: string | null;
  lessons: string | null;
  live_url: string | null;
  code_url: string | null;
  video_url: string | null;
  role_description: string | null;
  stats: Stat[];
  badges: Badge[];
  impact_metrics: ImpactMetric[];
  architecture_description: string | null;
  architecture_diagrams: ArchitectureDiagram[];
  related_documentation: DocRef[];
  code_steps: CodeStep[];
  code_snippets: CodeSnippet[];
  has_demo: boolean;
  demo_commands: DemoCommand[];
  demo_files_path: string | null;
  galleries: Gallery[];
  experience: ExperienceRef | null;
  order: number;
  created_at: string; // ISO-8601 (contract §3 preamble)
  updated_at: string;
}

// ---------------------------------------------------------------------------
// §3.4 GET /api/experiences/ (#6) — unpaginated plain array.
// ---------------------------------------------------------------------------

export interface ExperienceListItem {
  slug: string;
  company: string;
  role: string;
  subtitle: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // null = current
  period_display: string; // "May 2025 - Nov 2025" / "May 2025 - Present"
  stats: Stat[];
  project_count: number;
  is_active: boolean;
  order: number;
}

// ---------------------------------------------------------------------------
// §3.5 GET /api/experiences/{slug}/ (#7) — hero detail + nested cards.
// ---------------------------------------------------------------------------

export interface ExperienceCodeSample {
  title: string;
  description?: string;
  language?: string;
  code: string;
  category?: string;
}

export interface ExperienceDetail extends ExperienceListItem {
  overview: string;
  technologies: TechItem[];
  impact_metrics: ImpactMetric[];
  architecture_description: string | null;
  architecture_diagrams: ArchitectureDiagram[];
  code_samples: ExperienceCodeSample[];
  documentation: DocRef[];
  /** §2.3: inclusive (ey−sy)×12 + (em−sm) + 1; vs today when end_date null. */
  duration_months: number;
  /** Same card serializer as §3.1 — one shape everywhere. */
  projects: ProjectCard[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// §3.6 POST /api/contact/ (#8) — the single anonymous write. 5/min/IP.
// ---------------------------------------------------------------------------

export interface ContactPayload {
  name: string;
  email: string;
  message: string;
}

/** 201 response — echoes the submitted fields. */
export interface ContactCreated extends ContactPayload {}

// ---------------------------------------------------------------------------
// §3.7 GET /api/auth/terminal-token/ (#9) — guest JWT mint. 30/min/IP.
// ---------------------------------------------------------------------------

export interface TerminalTokenResponse {
  token: string; // HS256 guest JWT, exp 5 min, purpose=terminal_access
}

// ---------------------------------------------------------------------------
// §3.8 GET /api/projects/{slug}/files/ (#5) — R2 demo-zip URL.
// ---------------------------------------------------------------------------

export interface ProjectFilesResponse {
  file_url: string;
}

// ---------------------------------------------------------------------------
// §4.1 Error shape — DRF-native, frozen. One TS type covers everything.
// ---------------------------------------------------------------------------

/**
 * 400: field → string-list map (`{"email": ["…"]}`, `{"project_type": […]}`)
 * 404/429/405/403/500: `{"detail": "…"}` (429 key is `detail`, NOT `error`).
 */
export type ApiError = { detail?: string } & Record<string, string[] | string | undefined>;
