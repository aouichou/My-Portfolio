/**
 * @jest-environment node
 *
 * Behavioral capture tests — url-security (OLD module, portfolio_ui v1)
 * — SSR context (NO window at all).
 *
 * F3-01 Step 1: pin CURRENT server-side behavior of getConfiguredApiBaseUrl.
 * In a node environment `typeof window === 'undefined'` is genuinely true,
 * which is exactly the Next.js server-component condition.
 *
 * Ground truth: src/library/url-security.ts @ rework/v2 6bb5a78.
 */

import { getConfiguredApiBaseUrl } from '@/library/url-security';

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_API_URL;
  delete process.env.SERVER_API_URL;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('getConfiguredApiBaseUrl — SSR (typeof window === "undefined")', () => {
  it('prefers SERVER_API_URL over NEXT_PUBLIC_API_URL', () => {
    process.env.SERVER_API_URL = 'https://server-first.example.com/api';
    process.env.NEXT_PUBLIC_API_URL = 'https://public-second.example.com/api';
    expect(getConfiguredApiBaseUrl()).toBe('https://server-first.example.com/api');
  });

  it('falls back to NEXT_PUBLIC_API_URL when SERVER_API_URL is absent', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://public-fallback.example.com/api';
    expect(getConfiguredApiBaseUrl()).toBe('https://public-fallback.example.com/api');
  });

  it('falls back to the built-in default with no env at all', () => {
    expect(getConfiguredApiBaseUrl()).toBe('https://api.aouichou.me/api');
  });

  it('normalizes (strips one trailing slash) in the SSR branch', () => {
    process.env.SERVER_API_URL = 'https://server.example.com/api/';
    expect(getConfiguredApiBaseUrl()).toBe('https://server.example.com/api');
  });

  it('does NOT apply the localhost override server-side (no window)', () => {
    // The dev-machine page URL is unknowable during SSR — only env vars count.
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost/api';
    expect(getConfiguredApiBaseUrl()).toBe('http://localhost/api');
  });
});
