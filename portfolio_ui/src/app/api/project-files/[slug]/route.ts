// src/app/api/project-files/[slug]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  
  try {
    const projectFilesPath = path.join(process.cwd(), 'public', 'project-files', `${slug}.zip`);
    
    if (!fs.existsSync(projectFilesPath)) {
      return NextResponse.json(
        { error: 'Project files not found' },
        { status: 404 }
      );
    }
    
    const fileBuffer = fs.readFileSync(projectFilesPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${slug}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error serving project files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}