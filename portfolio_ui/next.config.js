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
	async rewrites() {
	  return [
		{
		  source: '/api/:path*',
		  destination: 'http://backend-service:8080/api/:path*',
		},
		{
		  source: '/media/:path*',
		  destination: 'http://backend-service:8080/media/:path*',
		},
	  ];
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
 	 headers: async () => [
  	  {
    	  source: '/(.*)',
    	  headers: [
			{
			key: 'Link',
			value: '</_next/static/css/[contenthash].css>; rel=preload; as=style'
			},
			{
			key: 'Link', 
			value: '</_next/static/media/[contenthash].woff2>; rel=preload; as=font; crossorigin=anonymous'
			}
		],
		},
	]
};
  
  module.exports = nextConfig;