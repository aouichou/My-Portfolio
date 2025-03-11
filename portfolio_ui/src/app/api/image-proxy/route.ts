import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
  }
  
  try {
    console.log('Image proxy request:', url);
    
    // Simplified validation
    if (!url.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
      return NextResponse.json({ error: 'Invalid URL domain' }, { status: 403 });
    }
    
    const response = await fetch(url, {
      cache: 'force-cache',
      next: { revalidate: 86400 },
	  headers: {
		   'Authorization': `AWS ${process.env.BUCKETEER_AWS_ACCESS_KEY_ID}:${process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY}`
		}
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json({ error: 'Image proxy error' }, { status: 500 });
  }
}