/**
 * @jest-environment-options {"url": "https://aouichou.me/projects"}
 *
 * Behavioral capture tests — url-security (OLD module, portfolio_ui v1)
 * — PRODUCTION page context.
 *
 * F3-01 Step 1: pin CURRENT behavior of the security-critical URL gate.
 * This file covers the non-localhost branch: env-driven base URL and the
 * ensureSafeApiUrl trusted-origin allowlist, with adversarial inputs.
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

describe('getConfiguredApiBaseUrl — production page', () => {
  it('uses NEXT_PUBLIC_API_URL, trailing slash stripped', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api/';
    expect(getConfiguredApiBaseUrl()).toBe('https://api.aouichou.me/api');
  });

  it('falls back to the built-in default when no env var is set', () => {
    expect(getConfiguredApiBaseUrl()).toBe('https://api.aouichou.me/api');
  });

  it('strips exactly ONE trailing slash (double slash survives)', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/api//';
    // String.replace(/\/$/, '') removes one trailing slash only.
    expect(getConfiguredApiBaseUrl()).toBe('https://api.example.com/api/');
  });
});

describe('buildApiUrl — against a production base', () => {
  it('joins segments with the trailing slash', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api';
    expect(buildApiUrl(['projects'])).toBe('https://api.aouichou.me/api/projects/');
  });

  it('builds nested detail paths', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api';
    expect(buildApiUrl(['projects', 'minishell', 'files'])).toBe(
      'https://api.aouichou.me/api/projects/minishell/files/'
    );
  });
});

describe('ensureSafeApiUrl — trusted-origin gate (production base)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.aouichou.me/api';
  });

  it('accepts a URL inside the allowed origin and /api path prefix', () => {
    expect(ensureSafeApiUrl('https://api.aouichou.me/api/projects/')).toBe(
      'https://api.aouichou.me/api/projects/'
    );
  });

  it('accepts the base root itself', () => {
    expect(ensureSafeApiUrl('https://api.aouichou.me/api/')).toBe(
      'https://api.aouichou.me/api/'
    );
  });

  it('accepts a URL WITHOUT trailing slash (path is slash-padded before compare)', () => {
    expect(ensureSafeApiUrl('https://api.aouichou.me/api/projects/minishell')).toBe(
      'https://api.aouichou.me/api/projects/minishell'
    );
  });

  it('rejects a different origin (evil twin host)', () => {
    expect(() => ensureSafeApiUrl('https://api.aouichou.me.evil.com/api/projects/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects the bare API host without the /api prefix', () => {
    expect(() => ensureSafeApiUrl('https://api.aouichou.me/projects/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects a same-origin path OUTSIDE /api (admin)', () => {
    expect(() => ensureSafeApiUrl('https://api.aouichou.me/admin/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects a same-origin path that merely STARTS LIKE the prefix (api-foo)', () => {
    // Prefix check requires a trailing slash boundary — /api-evil must fail.
    expect(() => ensureSafeApiUrl('https://api.aouichou.me/api-evil/thing')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects an http downgrade against the https base', () => {
    expect(() => ensureSafeApiUrl('http://api.aouichou.me/api/projects/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects userinfo tricks (https://trusted@evil)', () => {
    // The origin of https://api.aouichou.me@evil.com/... is evil.com → blocked.
    expect(() =>
      ensureSafeApiUrl('https://api.aouichou.me@evil.com/api/projects/')
    ).toThrow('Blocked fetch to unexpected API URL');
  });

  it('rejects userinfo with credentials (https://user:pass@evil)', () => {
    expect(() =>
      ensureSafeApiUrl('https://api.aouichou.me:secret@evil.com/api/')
    ).toThrow();
  });

  it('rejects a non-standard port on the trusted host', () => {
    // Origin includes the port — :8443 ≠ :443.
    expect(() => ensureSafeApiUrl('https://api.aouichou.me:8443/api/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects protocol-relative input (URL constructor throws Invalid URL — never a pass)', () => {
    // '//evil.com/api/': Node's URL constructor requires an absolute base —
    // it throws rather than resolving against the page. A throw is the
    // correct outcome: the input must never reach a fetch.
    expect(() => ensureSafeApiUrl('//evil.com/api/')).toThrow();
  });

  it('rejects protocol-relative input pointing at the API host (same: throws)', () => {
    expect(() => ensureSafeApiUrl('//api.aouichou.me/api/')).toThrow();
  });

  it('rejects javascript: URIs', () => {
    expect(() => ensureSafeApiUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects data: URIs', () => {
    expect(() => ensureSafeApiUrl('data:text/html,alert(1)')).toThrow();
  });

  it('rejects ftp scheme', () => {
    expect(() => ensureSafeApiUrl('ftp://api.aouichou.me/api/')).toThrow();
  });

  it('rejects a subdomain of the trusted host (api2.aouichou.me)', () => {
    expect(() => ensureSafeApiUrl('https://api2.aouichou.me/api/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });

  it('rejects the site origin (aouichou.me) — only the API host is trusted', () => {
    expect(() => ensureSafeApiUrl('https://aouichou.me/api/projects/')).toThrow(
      'Blocked fetch to unexpected API URL'
    );
  });
});
