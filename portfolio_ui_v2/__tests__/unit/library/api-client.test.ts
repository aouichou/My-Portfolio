/**
 * api-client v2 — contract tests (NEW suite for the REWRITTEN client).
 *
 * Unlike the capture suites (which pin v1 truth), these assert the v2
 * client speaks the FROZEN contract (docs/designs/2026-10-05-api-contract-v2.md):
 * endpoint paths, typed payloads, the pagination envelope, and the §4.1
 * error shape surfaced through toApiError.
 *
 * axios is mocked at the instance-method level; the real interceptor chain
 * runs where relevant (trailing-slash, 404 redirect — pinned by the moved
 * capture expectations below too).
 */

jest.mock('@/library/api-client', () => {
  // Partial import of the real module to keep the axios instance real while
  // letting endpoint tests spy on it is awkward under jest.mock; instead we
  // import the real module and spy at runtime in each test (see below).
  return jest.requireActual('@/library/api-client');
});

import {
    api,
    getExperienceBySlug,
    getExperiences,
    getProjectBySlug,
    getProjectFiles,
    getProjects,
    mintTerminalToken,
    submitContact,
    toApiError,
} from '@/library/api-client';
import type { AxiosError } from 'axios';

const apiGetSpy = jest.spyOn(api, 'get');
const apiPostSpy = jest.spyOn(api, 'post');

beforeEach(() => {
  apiGetSpy.mockReset();
  apiPostSpy.mockReset();
});

afterAll(() => {
  apiGetSpy.mockRestore();
  apiPostSpy.mockRestore();
});

describe('#3 GET /projects/ — §3.2 envelope + §1 params', () => {
  it('requests the bare list with no params', async () => {
    apiGetSpy.mockResolvedValueOnce({ data: { count: 0, next: null, previous: null, results: [] } });
    const page = await getProjects();
    expect(apiGetSpy).toHaveBeenCalledWith('/projects/', { params: undefined });
    expect(page).toEqual({ count: 0, next: null, previous: null, results: [] });
  });

  it('passes project_type / has_demo / limit / offset through', async () => {
    apiGetSpy.mockResolvedValueOnce({ data: { count: 1, next: null, previous: null, results: [] } });
    await getProjects({ project_type: 'school', has_demo: true, limit: 100, offset: 24 });
    expect(apiGetSpy).toHaveBeenCalledWith('/projects/', {
      params: { project_type: 'school', has_demo: true, limit: 100, offset: 24 },
    });
  });

  it('does NOT send is_featured or include_all (killed params, §1)', async () => {
    apiGetSpy.mockResolvedValueOnce({ data: { count: 0, next: null, previous: null, results: [] } });
    await getProjects({});
    const call = apiGetSpy.mock.calls[0]?.[1] as { params?: Record<string, unknown> };
    const paramKeys = Object.keys(call?.params ?? {});
    expect(paramKeys).not.toContain('is_featured');
    expect(paramKeys).not.toContain('include_all');
  });

  it('rejects (does not swallow) on failure — React Query owns retry', async () => {
    apiGetSpy.mockRejectedValueOnce(new Error('network down'));
    await expect(getProjects()).rejects.toThrow('network down');
  });
});

describe('#4 GET /projects/{slug}/ — §3.3 detail', () => {
  it('requests the slug path and returns the typed detail', async () => {
    const detail = {
      slug: 'minishell',
      title: 'Minishell',
      project_type: 'school',
      description: 'A bash-like shell.',
      readme: null,
      thumbnail_url: null,
      is_featured: true,
      score: 125,
      tech_stack: [],
      features: [],
      challenges: null,
      lessons: null,
      live_url: null,
      code_url: 'https://github.com/…',
      video_url: null,
      role_description: null,
      stats: [],
      badges: [],
      impact_metrics: [],
      architecture_description: null,
      architecture_diagrams: [],
      related_documentation: [],
      code_steps: [],
      code_snippets: [],
      has_demo: true,
      demo_commands: [],
      demo_files_path: 'project-files/minishell.zip',
      galleries: [],
      experience: null,
      order: 3,
      created_at: '2025-05-02T09:15:00Z',
      updated_at: '2026-10-05T21:03:00Z',
    };
    apiGetSpy.mockResolvedValueOnce({ data: detail });
    const result = await getProjectBySlug('minishell');
    expect(apiGetSpy).toHaveBeenCalledWith('/projects/minishell');
    expect(result).toEqual(detail);
    expect(result.slug).toBe('minishell');
  });
});

describe('#5 GET /projects/{slug}/files/ — §3.8', () => {
  it('requests the files path and returns {file_url}', async () => {
    apiGetSpy.mockResolvedValueOnce({
      data: { file_url: 'https://pub-….r2.dev/project-files/minishell.zip' },
    });
    const result = await getProjectFiles('minishell');
    expect(apiGetSpy).toHaveBeenCalledWith('/projects/minishell/files');
    expect(result.file_url).toContain('project-files/minishell.zip');
  });
});

describe('#6/#7 experiences — §3.4/§3.5', () => {
  it('lists experiences as a plain array (no envelope)', async () => {
    apiGetSpy.mockResolvedValueOnce({ data: [{ slug: 'qynapse-healthcare', company: 'Qynapse' }] });
    const list = await getExperiences();
    expect(apiGetSpy).toHaveBeenCalledWith('/experiences/');
    expect(Array.isArray(list)).toBe(true);
  });

  it('fetches the hero detail by slug', async () => {
    apiGetSpy.mockResolvedValueOnce({
      data: {
        slug: 'qynapse-healthcare',
        company: 'Qynapse',
        role: 'Fullstack Engineer intern',
        projects: [{ slug: 'qynapse-core', title: 'Qynapse — imaging pipeline' }],
      },
    });
    const detail = await getExperienceBySlug('qynapse-healthcare');
    expect(apiGetSpy).toHaveBeenCalledWith('/experiences/qynapse-healthcare');
    expect(detail.projects[0]?.slug).toBe('qynapse-core');
  });
});

describe('#8 POST /contact/ — §3.6', () => {
  it('posts the three-field payload', async () => {
    apiPostSpy.mockResolvedValueOnce({
      data: { name: 'A', email: 'a@b.c', message: 'hi' },
    });
    const result = await submitContact({ name: 'A', email: 'a@b.c', message: 'hi' });
    expect(apiPostSpy).toHaveBeenCalledWith('/contact/', {
      name: 'A',
      email: 'a@b.c',
      message: 'hi',
    });
    expect(result.email).toBe('a@b.c');
  });
});

describe('#9 GET /auth/terminal-token/ — §3.7', () => {
  it('mints the guest token via the typed client', async () => {
    apiGetSpy.mockResolvedValueOnce({ data: { token: 'jwt-abc' } });
    const { token } = await mintTerminalToken();
    expect(apiGetSpy).toHaveBeenCalledWith('/auth/terminal-token/');
    expect(token).toBe('jwt-abc');
  });
});

describe('toApiError — §4.1 error shape', () => {
  it('surfaces 400 field errors as the field → string-list map', () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 400, data: { email: ['Enter a valid email address'] } },
      message: 'Request failed with status code 400',
    } as unknown as AxiosError;
    expect(toApiError(axiosError)).toEqual({ email: ['Enter a valid email address'] });
  });

  it('surfaces 429 as {detail} (the frozen key — NOT error)', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 429,
        data: { detail: 'Too many requests, please try again later.' },
      },
      message: 'Request failed with status code 429',
    } as unknown as AxiosError;
    expect(toApiError(axiosError)).toEqual({
      detail: 'Too many requests, please try again later.',
    });
  });

  it('surfaces 404 detail', () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Not found.' } },
      message: 'Request failed with status code 404',
    } as unknown as AxiosError;
    expect(toApiError(axiosError)).toEqual({ detail: 'Not found.' });
  });

  it('wraps network errors (no response) as {detail: message}', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Network Error',
    } as unknown as AxiosError;
    expect(toApiError(axiosError)).toEqual({ detail: 'Network Error' });
  });

  it('wraps non-axios throws', () => {
    expect(toApiError(new Error('boom'))).toEqual({ detail: 'boom' });
    expect(toApiError('plain string')).toEqual({ detail: 'plain string' });
  });
});

describe('interceptors (ported v1 behavior, still pinned)', () => {
  it('request interceptor appends trailing slashes, preserving queries', async () => {
    type Handler = { fulfilled?: (config: { url?: string }) => { url?: string } | Promise<{ url?: string }> };
    const handlers = (api.interceptors.request.handlers ?? []) as unknown as Handler[];
    for (const interceptor of handlers) {
      if (interceptor.fulfilled) {
        const result = await interceptor.fulfilled({ url: '/projects?project_type=school' });
        expect(result.url).toBe('/projects/?project_type=school');
      }
    }
  });

  it('instance is configured with credentials + JSON content type', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});
