// src/app/api/project-files/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  
  try {
    // Get the file URL from the Django backend
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/projects/${slug}/files/`;
    const response = await fetch(apiUrl);
    
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