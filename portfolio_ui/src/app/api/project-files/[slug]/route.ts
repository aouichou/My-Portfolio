// src/app/api/project-files/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/library/url-security';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const response = await fetch(buildApiUrl(['projects', slug, 'files']));
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || 'Project files not found' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Redirect to the S3 URL
    return NextResponse.redirect(data.file_url);
    
  } catch (error) {
    console.error('Error serving project files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}