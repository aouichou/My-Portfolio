// portfolio_ui/src/app/api/image-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }
  
  try {
    // Only proxy from our S3 bucket
    if (!url.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
      console.error(`Invalid URL domain: ${url}`);
      return NextResponse.json({ error: 'Invalid URL domain' }, { status: 403 });
    }
    
    
    // Direct fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      // Return a default image instead of redirecting
      const fallbackResponse = await fetch(new URL('/fallback-image.jpg', request.nextUrl.origin));
      const fallbackBuffer = await fallbackResponse.arrayBuffer();
      return new NextResponse(fallbackBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    // Return fallback image bytes instead of redirecting
    try {
      const fallbackResponse = await fetch(new URL('/fallback-image.jpg', request.nextUrl.origin));
      const fallbackBuffer = await fallbackResponse.arrayBuffer();
      return new NextResponse(fallbackBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (fallbackError) {
      console.error("Fallback image error:", fallbackError);
      return NextResponse.json({ error: 'Image proxy error and fallback failed' }, { status: 500 });
    }
  }
}


// Improved image-proxy implementation
// import { NextRequest } from 'next/server';

// export async function GET(request: NextRequest) {
//   const url = request.nextUrl.searchParams.get('url');
  
//   if (!url) {
//     return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
//       status: 400,
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }

//   try {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
//     const response = await fetch(url, {
//       headers: {
//         'User-Agent': 'Mozilla/5.0 Portfolio Image Proxy',
//         'Accept': 'image/*',
//         'Cache-Control': 'no-cache'
//       },
//       signal: controller.signal,
//       next: { revalidate: 3600 } // Cache for 1 hour
//     });
//     clearTimeout(timeoutId);
    
//     if (!response.ok) {
//       console.error(`Image fetch failed for ${url}: ${response.status} ${response.statusText}`);
      
//       // Return a fallback image
//       return new Response(JSON.stringify({ error: 'Failed to fetch image', status: response.status }), {
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       });
//     }
    
//     const contentType = response.headers.get('content-type') || 'image/png';
//     const data = await response.arrayBuffer();
    
//     // Return the image with proper headers
//     return new Response(data, {
//       status: 200,
//       headers: {
//         'Content-Type': contentType,
//         'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization'
//       }
//     });
//   } catch (error) {
//     console.error('Image proxy error:', error);
    
//     // Return a fallback image
//     return new Response(JSON.stringify({ 
//       error: 'Image proxy error', 
//       message: error instanceof Error ? error.message : 'Unknown error' 
//     }), {
//       status: 500,
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }
// }