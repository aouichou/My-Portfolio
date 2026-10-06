/**
 * @jest-environment-options {"url": "http://localhost:3000/demo/minishell"}
 *
 * Behavioral capture tests — url-security (OLD module, portfolio_ui v1)
 * — LOCALHOST page context.
 *
 * F3-01 Step 1: pin CURRENT behavior of the security-critical URL gate.
 * This file covers the localhost-override branch (hostname localhost /
 * 127.0.0.1 forces http://localhost:8000/api regardless of env) plus the
 * SSR branch (window absent) and buildApiUrl joining rules that are
 * page-URL-independent.
 *
 * Ground truth: src/library/url-security.ts @ rework/v2 6bb5a78.
 */

import {
    buildApiUrl,
    ensureSafeApiUrl,
    getConfiguredApiBaseUrl,
} from '@/library/url-security';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.SERVER_API_URL;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getConfiguredApiBaseUrl — localhost page (the override branch)', () => {
  it('forces localhost:8000 on hostname localhost, ignoring NEXT_PUBLIC_API_URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api';
    expect(getConfiguredApiBaseUrl()).toBe('http://localhost:8000/api');
  });

  it('localhost override applies with no env var at all', () => {
    expect(getConfiguredApiBaseUrl()).toBe('http://localhost:8000/api');
  });

  it('strips a trailing slash from an env base BEFORE the override wins (env ignored entirely)', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://ignored.example.com/api/';
    // The override hardcodes the local API — env never reaches the return.
    expect(getConfiguredApiBaseUrl()).toBe('http://localhost:8000/api');
  });
});

describe('buildApiUrl — against the localhost override base', () => {
  it('joins segments and appends the trailing slash', () => {
    expect(buildApiUrl(['projects'])).toBe('http://localhost:8000/api/projects/');
  });

  it('encodes each segment independently (space → %20, stays one segment)', () => {
    expect(buildApiUrl(['projects', 'my project'])).toBe(
      'http://localhost:8000/api/projects/my%20project/'
    );
  });

  it('drops empty and whitespace-only segments', () => {
    expect(buildApiUrl(['projects', '', '  ', 'minishell'])).toBe(
      'http://localhost:8000/api/projects/minishell/'
    );
  });

  it('encodes hostile path traversal inside a segment (never resolves it)', () => {
    // ../ is percent-encoded as one segment — no traversal happens.
    expect(buildApiUrl(['projects', '../../../admin'])).toBe(
      'http://localhost:8000/api/projects/..%2F..%2F..%2Fadmin/'
    );
  });

  it('encodes a protocol-relative-looking segment as literal text', () => {
    // An attacker-supplied "//evil.com" slug becomes a percent-encoded
    // segment — it can NOT redirect the URL origin.
    expect(buildApiUrl(['//evil.com'])).toBe('http://localhost:8000/api/%2F%2Fevil.com/');
  });

  it('appends query params, skipping undefined values', () => {
    expect(
      buildApiUrl(['projects'], {
        project_type: 'school',
        limit: 24,
        has_demo: true,
        cursor: undefined,
      })
    ).toBe('http://localhost:8000/api/projects/?project_type=school&limit=24&has_demo=true');
  });

  it('returns the base root (with slash) for an empty segment list', () => {
    expect(buildApiUrl([])).toBe('http://localhost:8000/api/');
  });

  it('encodes query keys/values through URLSearchParams (proper escaping)', () => {
    expect(buildApiUrl(['projects'], { 'q x': 'a&b=c' })).toBe(
      'http://localhost:8000/api/projects/?q+x=a%26b%3Dc'
    );
  });
});

describe('ensureSafeApiUrl — against the localhost override base', () => {
  it('accepts URLs inside the localhost base origin + /api prefix', () => {
    expect(ensureSafeApiUrl('http://localhost:8000/api/projects/')).toBe(
      'http://localhost:8000/api/projects/'
    );
  });

  it('rejects the production API origin while on the localhost page', () => {
    // Cross-environment confusion guard: env var pointed at prod is IGNORED
    // on localhost, so prod URLs are NOT trusted here.
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api';
    expect(() => ensureSafeApiUrl('https://api.aouichou.me/api/projects/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects a same-origin path outside /api', () => {
    expect(() => ensureSafeApiUrl('http://localhost:8000/admin/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });
});
