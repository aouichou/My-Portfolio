/**
 * api-client — v2 (F3-01): REWRITTEN against the FROZEN contract v2.
 *
 * Source of truth: docs/designs/2026-10-05-api-contract-v2.md §1 (endpoint
 * table), §3 (shapes), §4.1 (error type). Types live in ./types/api-v2.ts
 * and are the machine contract — section citations on every call below.
 *
 * What changed vs the v1 client (behavioral, all documented in the report):
 *  - endpoints speak the NEW surface: no is_featured/include_all params
 *    (killed, §1), no /internships/* (deleted in F1-06)
 *  - responses are TYPED with the contract types (no untyped any payloads)
 *  - errors surface as ApiError ({detail} + field map, §4.1) — v1 swallowed
 *    list failures into []; v2 rejects (React Query owns retry policy)
 *  - the axios singleton keeps v1's interceptor behavior that the capture
 *    suite pins: trailing-slash request normalization + 404 redirect
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
    ApiError,
    ContactCreated,
    ContactPayload,
    ExperienceDetail,
    ExperienceListItem,
    PaginatedProjects,
    ProjectDetail,
    ProjectFilesResponse,
    ProjectsListParams,
    TerminalTokenResponse,
} from './types/api-v2';
import { getConfiguredApiBaseUrl } from './url-security';

/** Single source of truth for API URL with NO trailing slash. */
export const API_URL = getConfiguredApiBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ---------------------------------------------------------------------------
// Interceptors — behavior ported from v1 (capture suite pins these).
// ---------------------------------------------------------------------------

/** Request: append the trailing slash Django's APPEND_SLASH expects. */
api.interceptors.request.use((config) => {
  if (config.url) {
    const [base, query] = config.url.split('?') as [string, string | undefined];
    const newBase = base.endsWith('/') ? base : `${base}/`;
    config.url = query ? `${newBase}?${query}` : newBase;
  }
  return config;
});

/** Response: browser-level 404 → /404 page (v1 behavior, kept). */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 404) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- v1 parity: axios interceptor (outside React), full-document 404 redirect; useRouter is unreachable here.
      window.location.href = '/404';
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Error normalization — contract §4.1
// ---------------------------------------------------------------------------

/**
 * Normalize any thrown value into the contract error shape:
 * 400 → field → string-list map; 404/429/403/405/500 → {detail}.
 * Non-axios errors (network) become {detail: <message>}.
 */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }
    return { detail: axiosError.message };
  }
  if (error instanceof Error) {
    return { detail: error.message };
  }
  return { detail: String(error) };
}

// ---------------------------------------------------------------------------
// Endpoint calls — contract §1 table, top to bottom
// ---------------------------------------------------------------------------

/**
 * #3 — GET /api/projects/ (§3.2 envelope).
 * The full ledger, optionally filtered by type / has_demo, paginated
 * limit/offset (default 24/0, max 100 — server-enforced).
 */
export async function getProjects(
  params?: ProjectsListParams
): Promise<PaginatedProjects> {
  const response = await api.get<PaginatedProjects>('/projects/', { params });
  return response.data;
}

/**
 * #4 — GET /api/projects/{slug}/ (§3.3 detail).
 * Slug is the identity (§0.4) — model ids do not exist in v2 payloads.
 */
export async function getProjectBySlug(slug: string): Promise<ProjectDetail> {
  const response = await api.get<ProjectDetail>(`/projects/${slug}`);
  return response.data;
}

/**
 * #5 — GET /api/projects/{slug}/files/ (§3.8).
 * 200 → {file_url: R2 public URL}; 404 → {detail: "No demo files…"}.
 */
export async function getProjectFiles(slug: string): Promise<ProjectFilesResponse> {
  const response = await api.get<ProjectFilesResponse>(`/projects/${slug}/files`);
  return response.data;
}

/** #6 — GET /api/experiences/ (§3.4) — unpaginated plain array. */
export async function getExperiences(): Promise<ExperienceListItem[]> {
  const response = await api.get<ExperienceListItem[]>('/experiences/');
  return response.data;
}

/** #7 — GET /api/experiences/{slug}/ (§3.5) — hero + nested ProjectCards. */
export async function getExperienceBySlug(slug: string): Promise<ExperienceDetail> {
  const response = await api.get<ExperienceDetail>(`/experiences/${slug}`);
  return response.data;
}

/**
 * #8 — POST /api/contact/ (§3.6) — the single anonymous write.
 * 201 → echo; 400 → field errors; 429 → {detail} (5/min/IP).
 */
export async function submitContact(payload: ContactPayload): Promise<ContactCreated> {
  const response = await api.post<ContactCreated>('/contact/', payload);
  return response.data;
}

/** #9 — GET /api/auth/terminal-token/ (§3.7) — guest JWT, 30/min/IP. */
export async function mintTerminalToken(): Promise<TerminalTokenResponse> {
  const response = await api.get<TerminalTokenResponse>('/auth/terminal-token/');
  return response.data;
}

export default api;
