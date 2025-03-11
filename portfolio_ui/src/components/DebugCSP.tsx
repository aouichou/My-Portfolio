"use client";

import { useEffect } from 'react';

export default function DebugCSP() {
  useEffect(() => {
    // Log the CSP header that's active
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    console.log('CSP in meta tag:', csp?.getAttribute('content'));
    
    // Try to extract from Response headers
    fetch(window.location.href)
      .then(response => {
        console.log('CSP in response headers:', response.headers.get('Content-Security-Policy'));
      });
  }, []);
  
  return null;
}