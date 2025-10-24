// portfolio_ui/next.config.ts

// const securityHeaders = require('./security-headers');

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
  async headers() {
    // Define Content-Security-Policy
	const ContentSecurityPolicy = `
	  default-src 'self';
	  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://challenges.cloudflare.com;
	  style-src 'self' 'unsafe-inline';
	  img-src 'self' data: blob: https: http:;
	  font-src 'self' data: https:;
	  connect-src 'self' https: http: wss: ws:;
	  media-src 'self' data: blob: https: http:;
	  object-src 'none';
	  frame-src 'self' https://challenges.cloudflare.com;
	`;

    // Define all security headers inline
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'Referrer-Policy',
        value: 'same-origin'
      }
    ];
    
    return [
      {
        source: '/:path*',
        headers: securityHeaders
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