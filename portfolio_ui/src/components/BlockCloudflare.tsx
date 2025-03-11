"use client";

import { useEffect } from 'react';

export default function BlockCloudflare() {
  useEffect(() => {
    // Remove any Cloudflare scripts causing CORS issues
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && script.src.includes('cloudflareinsights.com')) {
        console.log('Removing problematic Cloudflare script');
        script.remove();
      }
    });
  }, []);
  
  return null;
}