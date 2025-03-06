// portfolio_ui/next.config.ts

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
};
  
  module.exports = nextConfig;