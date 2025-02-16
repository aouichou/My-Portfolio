// portfolio_ui/next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '127.0.0.1', 'backend'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
		port: '8000',
        pathname: '/media/**',
      }
    ],
    minimumCacheTTL: 60,
  },
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'http://backend:8000/media/:path*',
      }
    ];
  },
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;