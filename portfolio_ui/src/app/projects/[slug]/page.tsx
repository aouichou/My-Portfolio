// portfolio_ui/src/app/projects/[slug]/page.tsx


import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProjectBySlug } from '@/library/api-client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import React, { use } from 'react';
import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';
import ClientImage from '@/components/ClientImage';

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProjectBySlug(params.slug);
  return {
    title: project?.title || 'Project Not Found',
    description: project?.description || '',
  };
}

const ImageErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded-lg">
          <span className="text-gray-500">Failed to load image</span>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

const ImageComponent = ({ src, alt }: { src?: string; alt?: string }) => {
  if (!src) return null;

  // Handle external badges and social icons
  const isBadge = src.includes('img.shields.io/badge');
  const isSocialIcon = src.includes('github-profile-readme-generator') || 
                      src.includes('icons/Social');

  if (isBadge || isSocialIcon) {
    return (
      <Image
        src={src}  // Use original URL for external images
        alt={alt || ''}
        width={isBadge ? 24 : 40}
        height={isBadge ? 24 : 40}
        className={isBadge ? 'h-6 w-auto inline-block' : 'h-10 w-10 inline-block hover:opacity-80 transition-opacity'}
        style={{ margin: isBadge ? '0 4px' : '0 8px' }}
        unoptimized
      />
    );
  }

  // Handle local project images
  const imageUrl = src.startsWith('/media/') 
    ? src 
    : `/media/projects/${src.split('/').pop()}`;

  return (
    <ImageErrorBoundary>
      <div className="relative w-full aspect-video">
        <ClientImage
          src={imageUrl}
          alt={alt || ''}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="rounded-lg shadow-md object-cover"
          priority={true}
          loading="eager"
          onError={(e) => {
            console.error(`Failed to load image: ${imageUrl}`);
            e.currentTarget.style.display = 'none';
          }}
		  unoptimized
        />
      </div>
    </ImageErrorBoundary>
  );
};

export default async function Page({ params }: Props) {
  const project = await getProjectBySlug(params.slug)
  if (!project) notFound();
  
  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      <div className="prose-lg dark:prose-invert mx-auto">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            img: ImageComponent,
            p: ({ children }) => {
              const hasOnlyImages = React.Children.toArray(children).every(
                (child) => React.isValidElement(child) && child.type === 'img'
              );
  
              return hasOnlyImages ? (
                <div className="flex flex-wrap justify-center gap-4 my-8">
                  {children}
                </div>
              ) : (
                <p>{children}</p>
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