import type { NextConfig } from 'next';

/**
 * Next.js config — v2 scaffold (F3-06a).
 *
 * Strict defaults only. `ignoreBuildErrors` / `ignoreDuringBuilds` are
 * deliberately ABSENT and must never appear: type and lint failures fail
 * the build (brief §7.4 "verification, not assumption").
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
