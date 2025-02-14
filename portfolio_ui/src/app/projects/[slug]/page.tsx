// portfolio_ui/src/app/projects/[slug]/page.tsx

import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/lib/api-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import React from 'react';
import type { Metadata } from 'next';

type Props = {
  params: { slug: string };
};

// Handle metadata generation
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!params?.slug) return { title: 'Project Not Found' };
  
  const project = await getProjectBySlug(String(params.slug));
  return {
    title: project?.title || 'Project Not Found',
    description: project?.description || '',
  };
}

const imageComponent = ({ node, ...props }: any) => {
  const src = props.src || '';
  
  // Handle different image types
  const isBadge = src.includes('img.shields.io/badge');
  const isSocialIcon = src.includes('github-profile-readme-generator') || 
                      src.includes('icons/Social');
  
  if (isBadge || isSocialIcon) {
    return (
      <img
        {...props}
        className={isBadge ? "h-6 w-auto inline-block" : "h-10 w-10 inline-block hover:opacity-80 transition-opacity"}
        style={{ margin: isBadge ? '0 4px' : '0 8px' }}
      />
    );
  }

  // Handle relative image paths
  let imgSrc = src;
  if (src.startsWith('images/') || src.startsWith('media/')) {
    // Use Django media URL for project images
    imgSrc = `http://localhost:8000/media/projects/${src.split('/').pop()}`;
  }

  try {
    // Validate URL before passing to Next.js Image
    new URL(imgSrc);
    return (
      <Image
        {...props}
        src={imgSrc}
        alt={props.alt || ''}
        width={800}
        height={400}
        className="rounded-lg shadow-md mx-auto"
        unoptimized={src.endsWith('.gif')} // Don't optimize GIFs
      />
    );
  } catch {
    // Fallback for invalid URLs
    return <img {...props} src="/placeholder.jpg" alt={props.alt || 'Placeholder'} />;
  }
};

export default async function ProjectPage({ params }: Props) {
  if (!params?.slug) notFound();

  const project = await getProjectBySlug(String(params.slug));
  if (!project) notFound();

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose-lg dark:prose-invert mx-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: imageComponent,
            p: ({ children, ...props }) => {
              const hasOnlyImages = React.Children.toArray(children).every(
                child => React.isValidElement(child) && child.type === 'img'
              );
              
              return hasOnlyImages ? (
                <div className="flex flex-wrap justify-center gap-4 my-8" {...props}>
                  {children}
                </div>
              ) : (
                <p {...props}>{children}</p>
              );
            },
          }}
        >
          {project.readme || ''}
        </ReactMarkdown>
      </div>
    </article>
  );
}