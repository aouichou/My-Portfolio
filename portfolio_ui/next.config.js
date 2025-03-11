// portfolio_ui/next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    domains: [
      'bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579.s3.eu-west-1.amazonaws.com',
      's3.eu-west-1.amazonaws.com',
      'portfolio-backend-dytv.onrender.com',
    ],
    minimumCacheTTL: 60,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Only include essential headers here
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  },
  env: {
    PORT: process.env.PORT || '3000',
    NEXT_PUBLIC_API_URL: 'https://portfolio-backend-dytv.onrender.com/api',
    NEXT_PUBLIC_MEDIA_URL: 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579',
  }
};

module.exports = nextConfig;