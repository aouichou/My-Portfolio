// portfolio_ui/next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	images: {
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
	optimizeFonts: true,
  		experimental: {
    	optimizeCss: true,
 	 },
};
  
  module.exports = nextConfig;