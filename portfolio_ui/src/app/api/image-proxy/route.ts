import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	const url = request.nextUrl.searchParams.get('url');
	
	if (!url?.includes('bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579')) {
	  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
	}
  
	try {
	  const s3Response = await fetch(url, {
		headers: {
		  'Authorization': `AWS ${process.env.BUCKETEER_AWS_ACCESS_KEY_ID}:${process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY}`
		}
	  });
  
	  if (!s3Response.ok) throw new Error('S3 fetch failed');
  
	  return new NextResponse(s3Response.body, {
		headers: {
		  'Content-Type': s3Response.headers.get('content-type') || 'image/png',
		  'Cache-Control': 'public, max-age=31536000, immutable'
		}
	  });
	} catch (error) {
	  return NextResponse.redirect('/fallback-image.jpg');
	}
  }