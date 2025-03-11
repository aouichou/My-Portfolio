"use client";

import { useEffect } from 'react';

export default function DebugCSP() {
  useEffect(() => {
    // Wrap in try-catch to avoid any errors breaking the page
    try {
      const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      console.log('CSP in meta tag:', csp?.getAttribute('content'));
      
      // Fetch current URL to check headers
      fetch(window.location.href)
        .then(response => {
          console.log('CSP in response headers:', response.headers.get('Content-Security-Policy'));
        })
        .catch(err => {
          console.log('Error checking CSP headers:', err);
        });
    } catch (error) {
      console.log('Error in DebugCSP component:', error);
    }
  }, []);
  
  return null;
}