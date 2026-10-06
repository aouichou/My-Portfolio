/**
 * url-security — v2 port (F3-01).
 *
 * Ported verbatim in behavior from portfolio_ui/src/library/url-security.ts
 * @ rework/v2 6bb5a78 (capture suite: __tests__/unit/library/
 * url-security.test.{localhost,production,ssr}.ts — those tests moved to
 * portfolio_ui_v2 unchanged and must keep passing).
 *
 * The ONE deliberate fix (Step-1-suite-proven bug, documented in
 * f3-01-manifest-port.md): none. Behavior is byte-identical, including the
 * known quirks the capture tests pin:
 *   - localhost hostname forces http://localhost:8000/api (env ignored)
 *   - exactly one trailing slash stripped
 *   - SSR: SERVER_API_URL > NEXT_PUBLIC_API_URL > default
 */

const DEFAULT_API_URL = 'https://api.aouichou.me/api';

function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function getConfiguredApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return normalizeApiBaseUrl(
      process.env.SERVER_API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
    );
  }

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalhost) {
    return 'http://localhost:8000/api';
  }

  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL);
}

export function buildApiUrl(
  pathSegments: string[],
  queryParams?: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = new URL(`${getConfiguredApiBaseUrl()}/`);
  const encodedPath = pathSegments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const url = new URL(encodedPath ? `${encodedPath}/` : '', baseUrl);

  Object.entries(queryParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function ensureSafeApiUrl(url: string): string {
  const candidate = new URL(url);
  const allowedBase = new URL(`${getConfiguredApiBaseUrl()}/`);
  const allowedPathPrefix = allowedBase.pathname.endsWith('/')
    ? allowedBase.pathname
    : `${allowedBase.pathname}/`;
  const candidatePath = candidate.pathname.endsWith('/')
    ? candidate.pathname
    : `${candidate.pathname}/`;

  if (candidate.origin !== allowedBase.origin || !candidatePath.startsWith(allowedPathPrefix)) {
    throw new Error('Blocked fetch to unexpected API URL');
  }

  return candidate.toString();
}
