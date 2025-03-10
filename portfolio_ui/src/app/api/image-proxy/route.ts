import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }
  
  try {
    console.log('Image proxy request for:', url);

    // Allow both URL formats for the bucket
    const validDomains = [
      'bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579',
      's3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579'
    ];
    
    const isValidUrl = validDomains.some(domain => url.includes(domain));
    if (!isValidUrl) {
      console.error('Invalid URL domain:', url);
      return NextResponse.json({ error: 'Invalid URL domain' }, { status: 403 });
    }
    
    const response = await fetch(url, {
      cache: 'force-cache',
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return NextResponse.json({ 
        error: `Failed to fetch image: ${response.status}`,
        url: url
      }, { status: response.status });
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
    return NextResponse.json({ 
      error: 'Failed to proxy image',
      message: (error instanceof Error) ? error.message : String(error),
      url: url
    }, { status: 500 });
  }
}