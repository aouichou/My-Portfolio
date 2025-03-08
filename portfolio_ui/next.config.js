// portfolio_ui/next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
	images: {
		remotePatterns: [
		  {
			protocol: 'https',
			hostname: 'bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579.s3.eu-west-1.amazonaws.com',
			pathname: '/**',
		  }
		]
	  },
    minimumCacheTTL: 60,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data: https:; connect-src 'self' https: http:; media-src 'self' data: blob: https: http:; object-src 'none'; frame-src 'self';"
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
	env: {
	PORT: process.env.PORT || '3000',
	NEXT_PUBLIC_API_URL: 'https://portfolio-backend-dytv.onrender.com/api',
	NEXT_PUBLIC_MEDIA_URL: 'https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579',
	},

	async redirects() {
		return [
		  {
			source: '/:path*',
			has: [{ type: 'host', value: 'www.aouichou.me' }],
			destination: 'https://aouichou.me/:path*',
			permanent: true,
		  },
		  {
			source: '/favicon.ico',
			destination: '/static/favicon.ico',
			permanent: true,
		  }
		];
	  },
};

module.exports = nextConfig;