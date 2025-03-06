// portfolio_ui/next.config.ts

const securityHeaders = require('./security-headers');

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
	  unoptimized: true,
	  remotePatterns: [
		{
		  protocol: 'https',
		  hostname: 'aouichou.me',
		  pathname: '/media/**',
		},
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
		return [
		  {
			source: '/security-headers.js',
			headers: securityHeaders,
		  },
		];
	  },
	env: {
	PORT: process.env.PORT || '3000',
	NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
	NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL || '/media',
	},
};
  
  module.exports = nextConfig;