// portfolio_ui/src/app/projects/[slug]/page.tsx

import Image from 'next/image';
import { getProjectBySlug } from '@/library/api-client';
import ReactMarkdown from 'react-markdown';
import {Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/tabs';
import FeatureCard from '@/components/FeatureCard';
import ImageCarousel from '@/components/ImageCarousel';
import React from 'react';
import { Metadata } from 'next';
import { ErrorBoundary } from 'react-error-boundary';
import ClientImage from '@/components/ClientImage';
import { Suspense } from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Gallery, GalleryImage, Project } from '@/library/types';

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
        src={src} // Use original URL for external images
        alt={alt || ''}
        width={isBadge ? 24 : 40}
        height={isBadge ? 24 : 40}
        className={isBadge ? 'h-6 w-auto inline-block' : 'h-10 w-10 inline-block hover:opacity-80 transition-opacity'}
        style={{ margin: isBadge ? '0 4px' : '0 8px' }}
        unoptimized
      />
    );
  }


	return (
	<ImageErrorBoundary>
		<div className="relative w-full aspect-video">
		<ClientImage
			src={src}
			alt={alt || ''}
			fill
			// Remove width/height when using fill
			sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
			className="rounded-lg shadow-md object-cover"
			priority={true}
			loading="eager"
			fallbackSrc="/fallback-image.jpg"
			unoptimized
		/>
		</div>
	</ImageErrorBoundary>
	);
};

export async function generateStaticParams() {
	return []; // Empty array for dynamic SSR
  }

export default function Page({ params }: Props) {
	return (
	  <Suspense fallback={<LoadingSkeleton />}>
		<ProjectPageContent params={params} />
	  </Suspense>
	);
  }

async function ProjectPageContent({ params }: Props) {
	try {
		const project = await getProjectBySlug(params.slug);
	
		return (
		<article className="max-w-6xl mx-auto px-4 py-12">
			{/* Hero Section */}
			<div className="mb-16">
				<h1 className="text-5xl font-bold mb-6 dark:text-white">
					{project.title}
				</h1>
				<div className="flex gap-2 flex-wrap mb-6">
					{project.tech_stack.map((tech: string) => (
						<span key={tech} className="badge-tech">
							{tech}
						</span>
					))}
				</div>
			</div>

			{/* Interactive Tabs */}
			<Tabs defaultValue="overview" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="features">Features</TabsTrigger>
					<TabsTrigger value="architecture">Architecture</TabsTrigger>
					<TabsTrigger value="challenges">Challenges</TabsTrigger>
				</TabsList>

				<TabsContent value="overview">
					<ReactMarkdown>{project.description}</ReactMarkdown>
				</TabsContent>

				<TabsContent value="features">
					<div className="grid md:grid-cols-2 gap-6">
						{project.features.map((feature, index) => (
							<FeatureCard key={index} feature={feature} index={index} />
						))}
					</div>
				</TabsContent>

				<TabsContent value="architecture">
					<ClientImage
						src={project.architecture_diagram}
						alt="Architecture Diagram"
						className="rounded-xl border"
						width={800}
						height={450}
						fallbackSrc="/fallback-diagram.jpg"
						unoptimized
					/>
				</TabsContent>

				<TabsContent value="challenges">
					<div className="prose-lg dark:prose-invert">
						<h3 className="text-2xl font-bold mb-4">Technical Challenges</h3>
						<p>{project.challenges}</p>

						<h3 className="text-2xl font-bold mt-8 mb-4">Key Learnings</h3>
						<p>{project.lessons}</p>
					</div>
				</TabsContent>
			</Tabs>

			{/* Interactive Gallery */}
			{project.galleries?.map((gallery: Gallery) => (
				<section key={gallery.name} className="my-16">
					<h2 className="text-3xl font-bold mb-8">{gallery.name}</h2>
					{gallery.description && (
						<p className="text-lg mb-6">{gallery.description}</p>
					)}
					<ImageCarousel
						images={gallery.images.map((img: GalleryImage) => ({
							image: img.image,
							caption: img.caption
						}))}
					/>
				</section>
			))}
		</article>
		);
  		} catch (error) {
			console.error('Project page error:', error);
			return (
			  <div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
				  <h1 className="text-4xl font-bold mb-4">Project Not Found</h1>
				  <p className="text-lg text-gray-600">
					The requested project could not be loaded
				  </p>
				</div>
			  </div>
			);
		  }
}