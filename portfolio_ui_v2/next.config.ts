import type { NextConfig } from 'next';
import { join } from 'node:path';

/**
 * Next.js config — v2 scaffold (F3-06a).
 *
 * Strict defaults only. `ignoreBuildErrors` / `ignoreDuringBuilds` are
 * deliberately ABSENT and must never appear: type and lint failures fail
 * the build (brief §7.4 "verification, not assumption").
 *
 * F3-06b: `turbopack.root` is pinned to the git worktree root so the
 * stray `~/package-lock.json` on dev machines can never leak into
 * module resolution (Next warned and ignored it — silenced by scoping,
 * not by suppressing warnings).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: join(__dirname, '..', '..'),
  },
};

export default nextConfig;
