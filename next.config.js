// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/media/**',
      },
	  {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.shields.io',
        port: '',
        pathname: '/**',
      },
	  {
	    protocol: 'https',
	    hostname: 'img.shields.io',
	    pathname: '/badge/**',
	  },
	  {
	    protocol: 'https',
	    hostname: 'raw.githubusercontent.com',
	    pathname: '/**',
	  },
	  {
	    protocol: 'https',
	    hostname: 'github.com',
	    pathname: '/**',
	  },
	  {
        protocol: 'https',
        hostname: '/**',
      },
    ],
	dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  }
};

module.exports = nextConfig;