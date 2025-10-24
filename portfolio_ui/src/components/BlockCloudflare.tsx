"use client";

import { useEffect } from 'react';

export default function BlockCloudflare() {
  useEffect(() => {
    // Remove any Cloudflare scripts causing CORS issues
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src) {
        try {
          // Parse the URL properly to check the hostname
          const url = new URL(script.src);
          // Check if the hostname ends with cloudflareinsights.com
          if (url.hostname === 'cloudflareinsights.com' || 
              url.hostname.endsWith('.cloudflareinsights.com')) {
            script.remove();
          }
        } catch {
          // Invalid URL, skip (no need to log in production)
        }
      }
    });
  }, []);
  
  return null;
}