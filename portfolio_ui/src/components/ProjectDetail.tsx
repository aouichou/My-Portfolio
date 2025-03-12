// portfolio_ui/src/components/ProjectDetail.tsx

'use client';

import { useProjectBySlug } from '@/library/queries';
import ReactMarkdown from 'react-markdown';
// import {Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/tabs';
import ImageCarousel from '@/components/ImageCarousel';
import ClientImage from '@/components/ClientImage';
import { Gallery, GalleryImage, Project } from '@/library/types';
import * as React from 'react';
import { MotionDiv, MotionH1, MotionSection } from '@/components/Motion';
import { useState } from 'react';
import { GithubContributions } from '@/components/GithubContributions';
import { CodeWindow } from '@/components/CodeWindow';
import { Progress } from '@/components/ui/progress';
// import { Lightbox } from '@/components/Lightbox';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/Icons';
import { MermaidComponent } from '@/components/MermaidComponent';
import ScrollToTop from '@/components/ScrollToTop';

interface ProjectDetailProps {
  slug: string;
  initialProject?: Project;
}


const DiagramRenderer = ({ diagram, type }: { diagram: string; type: string }) => {
	if (type === 'MERMAID') {
	  return <MermaidComponent chart={diagram} />;
	}
	
	if (type === 'SVG') {
	  return <div dangerouslySetInnerHTML={{ __html: diagram }} />;
	}
  
	if (type === 'ASCII') {
	  return <pre className="font-mono bg-muted p-4 rounded-lg">{diagram}</pre>;
	}
  
	return (
	  <div className="text-muted-foreground">
		Unsupported diagram type: {type}
	  </div>
	);
  };

const ImageComponent = ({ src, alt }: { src?: string; alt?: string }) => {
  return (
    <div className="my-4">
      <ClientImage
        src={src}
        alt={alt || ""}
        className="rounded-lg w-full"
      />
    </div>
  );
};

export function ProjectDetail({ slug, initialProject }: ProjectDetailProps) {
  const { data: project, isLoading, error } = useProjectBySlug(slug, initialProject);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Loading state
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  // Error state
  if (error || !project) {
    return <div className="p-8 text-center">Project not found</div>;
  }

  return (
	<MotionDiv
	  initial={{ opacity: 0 }}
	  animate={{ opacity: 1 }}
	  transition={{ duration: 0.5 }}
	  className="max-w-7xl mx-auto px-4 py-12"
	>
	  {/* Hero Section */}
	  <section className="mb-16 text-center">
		<MotionH1
		  initial={{ y: 20, opacity: 0 }}
		  animate={{ y: 0, opacity: 1 }}
		  className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent mb-6"
		>
		  {project.title}
		</MotionH1>

		<MotionDiv
		  className="flex flex-wrap gap-3 justify-center mb-8"
		  initial={{ opacity: 0 }}
		  animate={{ opacity: 1 }}
		  transition={{ delay: 0.2 }}
		>
			{project.tech_stack.map((tech: string) => (
			<Badge
				key={tech}
				className="px-4 py-2 text-sm font-mono bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-all"
			>
				{tech}
			</Badge>
			))}
		</MotionDiv>

		<div className="flex justify-center gap-4 mb-12">
			{project.live_url && (
				<a
				href={project.live_url}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all"
				>
				<div className="h-5 w-5">
					<Icons.externalLink />
				</div>
				Live Demo
				</a>
			)}
			
			{project.code_url && (
				<a
				href={project.code_url}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-all"
				>
				<div className="h-5 w-5 text-black dark:text-white">
					<Icons.github />
				</div>
				View Code
				</a>
			)}
			</div>
	  </section>

	{/* Project Description */}
	<section className="my-12 p-8 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 shadow-lg">
	  <h2 className="text-3xl font-bold mb-6 text-blue-900 dark:text-blue-100">Project Overview</h2>
	  <MotionDiv 
		className="prose prose-lg dark:prose-invert max-w-none"
		initial={{ opacity: 0 }}
		animate={{ opacity: 1 }}
		transition={{ duration: 0.5 }}
	  >
		<ReactMarkdown components={{
		  img: ({ node, ...props }) => (
			<ImageComponent src={props.src} alt={props.alt} />
		  )
		}}>
		  {project.description}
		</ReactMarkdown>
	  </MotionDiv>
	</section>
	
	{/* Technical Challenges & Key Learnings */}
	<section className="my-12">
	  <h2 className="text-3xl font-bold mb-8">Insights & Challenges</h2>
	  <div className="grid md:grid-cols-2 gap-8">
		<MotionDiv 
		  className="p-6 rounded-xl bg-red-500/5 border border-red-500/20"
		  initial={{ opacity: 0 }}
		  animate={{ opacity: 1 }}
		>
		  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
			<div className="h-6 w-6 text-red-500">
			  <Icons.challenge />
			</div>
			Technical Challenges
		  </h3>
		  <p className="text-muted-foreground">{project.challenges}</p>
		</MotionDiv>
	
		<MotionDiv 
		  className="p-6 rounded-xl bg-green-500/5 border border-green-500/20"
		  initial={{ opacity: 0 }}
		  animate={{ opacity: 1 }}
		>
		  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
			<div className="h-6 w-6 text-green-500">
			  <Icons.learning />
			</div>
			Key Learnings
		  </h3>
		  <p className="text-muted-foreground">{project.lessons}</p>
		</MotionDiv>
	  </div>
	
	  {/* Development Timeline (if available) */}
	  {project.development_steps && project.development_steps.length > 0 && (
		<div className="mt-12">
		  <h4 className="text-xl font-semibold mb-6">Development Timeline</h4>
		  <div className="relative pl-6 border-l-2 border-accent">
			{project.development_steps.map((step, index) => (
			  <MotionDiv
				key={index}
				className="mb-8 pl-6 relative"
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ delay: index * 0.1 }}
			  >
				<div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-2 border-2 border-background" />
				<h5 className="font-medium mb-2">{step.title}</h5>
				<p className="text-sm text-muted-foreground">{step.description}</p>
			  </MotionDiv>
			))}
		  </div>
		</div>
	  )}
	</section>
	
	{/* Features Section  */}
	<section className="my-12">
	  <h2 className="text-3xl font-bold mb-8">Key Features</h2>
	  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
		{project.features.map((feature: any, index: number) => {
		  // Handle both string and object formats
		  const featureText = typeof feature === 'string' ? feature : feature.text;
		  const completionPercentage = 
			typeof feature === 'object' && 'completionPercentage' in feature
			  ? feature.completionPercentage
			  : (index + 1) * 25;  // Fallback to original calculation
		  
		  return (
			<MotionDiv
			  key={index}
			  whileHover={{ y: -3, scale: 1.03 }}
			  className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-all h-full flex flex-col justify-between"
			>
			  <div>
				<div className="mb-2">
				  <div className="h-5 w-5 text-primary">
					<Icons.feature />
				  </div>
				</div>
				<p className="text-sm text-muted-foreground line-clamp-4">{featureText}</p>
			  </div>
			  <div className="mt-3">
				<Progress value={completionPercentage} className="h-1.5 w-full" />
			  </div>
			</MotionDiv>
		  );
		})}
	  </div>
	</section>

		{/* Architecture Diagram */}
		{project.architecture_diagram && (
		  <section className="my-16">
			<h2 className="text-3xl font-bold mb-8">System Architecture</h2>
			<MotionDiv
			  initial={{ opacity: 0, y: 20 }}
			  animate={{ opacity: 1, y: 0 }}
			  transition={{ duration: 0.5 }}
			>
			  <DiagramRenderer 
				diagram={project.architecture_diagram} 
				type={project.diagram_type || 'MERMAID'} 
			  />
			</MotionDiv>
		  </section>
		)}

	  {/* Interactive Gallery */}
	  {project.galleries?.map((gallery: Gallery) => (
		<section key={gallery.name} className="my-16">
		  <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
		   <div className="h-8 w-8 text-primary">
			  <Icons.gallery />
		   </div>
			{gallery.name}
		  </h2>
		  {gallery.description && (
			<p className="text-lg mb-6 text-muted-foreground">{gallery.description}</p>
		  )}
		  <ImageCarousel
			images={gallery.images.map((img: GalleryImage) => ({
			  image: img.image,
			  caption: img.caption
			}))}
		  />
		</section>
	  ))}

	  {/* GitHub Contributions */}
	  {project.code_url && (
		<section className="my-16">
		  <h2 className="text-3xl font-bold mb-8">Development Activity</h2>
		  <GithubContributions repoUrl={project.code_url} />
		</section>
	  )}

	  {/* Code Showcase */}
	  {(project.code_snippet || project.styles_snippet) && (
		<section className="my-16">
		  <h2 className="text-3xl font-bold mb-8">Code Highlights</h2>
		  <div className="grid md:grid-cols-2 gap-6">
			{project.code_snippet && (
			  <CodeWindow
				title="core.js"
				language="javascript"
				code={project.code_snippet}
			  />
			)}
			{project.styles_snippet && (
			  <CodeWindow
				title="styles.css"
				language="css"
				code={project.styles_snippet}
			  />
			)}
		  </div>
		</section>
	  )}

	  {/* Video Demo */}
	  {project.video_url && (
		<section className="my-16">
		  <h2 className="text-3xl font-bold mb-8">Project Walkthrough</h2>
		  <div className="aspect-video rounded-xl overflow-hidden border">
			<video controls className="w-full h-full">
			  <source src={project.video_url} type="video/mp4" />
			  Your browser does not support the video tag.
			</video>
		  </div>
		</section>
	  )}

	  {/* Live Demo Banner */}
	  <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
		<div className="flex items-center gap-2">
		  <div className="h-6 w-6">
			  <Icons.sparkles />
		  </div>
		  <span className="font-medium">Interactive Demo Available</span>
		</div>
		<a
		  href={project.live_url}
		  target="_blank"
		  rel="noopener noreferrer"
		  className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
		>
		  <div className="h-5 w-5">
			  <Icons.rocket />
		  </div>
		  Launch Demo
		</a>
	  </div>
	  <ScrollToTop />
	</MotionDiv>
  );
}