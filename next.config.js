// next.config.js

const nextConfig = {
	output: 'export',  // Enable static export
	images: {
	  unoptimized: true,  // Disable image optimization for static export
	},
  };
  
module.exports = nextConfig;

// /** @type {import('next').NextConfig} */
// const nextConfig = {
// 	images: {
// 	  remotePatterns: [
// 		{
// 		  protocol: 'http',
// 		  hostname: 'localhost',
// 		  port: '8000',
// 		  pathname: '/media/**',
// 		},
// 		{
// 		  protocol: 'http',
// 		  hostname: '127.0.0.1',
// 		  port: '8000',
// 		  pathname: '/media/**',
// 		},
// 		{
// 		  protocol: 'https',
// 		  hostname: 'raw.githubusercontent.com',
// 		  pathname: '/**',
// 		},
// 		{
// 		  protocol: 'https',
// 		  hostname: 'github.com',
// 		  pathname: '/**',
// 		},
// 		{
// 		  protocol: 'https',
// 		  hostname: 'img.shields.io',
// 		  pathname: '/badge/**',
// 		}
// 	  ],
// 	  dangerouslyAllowSVG: true,
// 	  contentDispositionType: 'attachment',
// 	  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
// 	}
//   };
  
//   module.exports = nextConfig;