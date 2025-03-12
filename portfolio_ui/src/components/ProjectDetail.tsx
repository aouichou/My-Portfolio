// portfolio_ui/src/components/ProjectDetail.tsx

'use client';

import { useProjectBySlug } from '@/library/queries';
import ReactMarkdown from 'react-markdown';
import {Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/tabs';
import ImageCarousel from '@/components/ImageCarousel';
import React from 'react';
import ClientImage from '@/components/ClientImage';
import { Gallery, GalleryImage, Project } from '@/library/types';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { GithubContributions } from '@/components/GithubContributions';
import { CodeWindow } from '@/components/CodeWindow';
import { Progress } from '@/components/ui/progress';
import { Lightbox } from '@/components/Lightbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/Icons';
import { MermaidComponent } from '@/components/MermaidComponent';

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
	<motion.div
	  initial={{ opacity: 0 }}
	  animate={{ opacity: 1 }}
	  transition={{ duration: 0.5 }}
	  className="max-w-7xl mx-auto px-4 py-12"
	>
	  {/* Hero Section */}
	  <section className="mb-16 text-center">
		<motion.h1
		  initial={{ y: 20, opacity: 0 }}
		  animate={{ y: 0, opacity: 1 }}
		  className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent mb-6"
		>
		  {project.title}
		</motion.h1>

		<motion.div
		  className="flex flex-wrap gap-3 justify-center mb-8"
		  initial={{ opacity: 0 }}
		  animate={{ opacity: 1 }}
		  transition={{ delay: 0.2 }}
		>
		  {project.tech_stack.map((tech: string) => (
			<Badge
			  key={tech}
			  variant="outline"
			  className="px-4 py-2 text-sm font-mono hover:bg-accent/50 transition-all"
			>
			  {tech}
			</Badge>
		  ))}
		</motion.div>

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
			  className="flex items-center gap-2 px-6 py-3 border border-accent hover:bg-accent/10 rounded-full transition-all"
			>
			  <div className="h-5 w-5">
			  <Icons.github />
			  </div>
			  View Code
			</a>
		  )}
		</div>
	  </section>

	  {/* Interactive Tabs */}
	  <Tabs value={activeTab} onValueChange={setActiveTab}>
		  <TabsList className="grid w-full grid-cols-4 bg-background/50 backdrop-blur-sm">
			  {['overview', 'features', 'architecture', 'challenges'].map((tab) => (
			  <TabsTrigger
				  key={tab}
				  value={tab}
				  className="data-[state=active]:bg-accent/10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
			  >
				  {tab.charAt(0).toUpperCase() + tab.slice(1)}
			  </TabsTrigger>
			  ))}
		  </TabsList>

		<motion.div
		  key={activeTab}
		  initial={{ opacity: 0, y: 10 }}
		  animate={{ opacity: 1, y: 0 }}
		  transition={{ duration: 0.3 }}
		>
		  <TabsContent value="overview" className="mt-8">
			<motion.div className="prose prose-lg dark:prose-invert max-w-none">
			  <ReactMarkdown components={{
				img: ({ node, ...props }) => (
				  <ImageComponent src={props.src} alt={props.alt} />
				)
			  }}>
				{project.description}
			  </ReactMarkdown>
			</motion.div>
		  </TabsContent>

		  <TabsContent value="features" className="mt-8">
			<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{project.features.map((feature: any, index: number) => {
			  // Handle both string and object formats
			  const featureText = typeof feature === 'string' ? feature : feature.text;
			  const completionPercentage = 
				typeof feature === 'object' && 'completionPercentage' in feature
				  ? feature.completionPercentage
				  : (index + 1) * 25;  // Fallback to original calculation
			  
			  return (
				<motion.div
				  key={index}
				  whileHover={{ y: -5 }}
				  className="p-6 rounded-xl border bg-card/50 hover:bg-card transition-all"
				>
				  <div className="flex items-center gap-3 mb-4">
					<div className="p-2 bg-primary/10 rounded-full">
					  <div className="h-6 w-6 text-primary">
						<Icons.feature />
					  </div>
					</div>
					<h3 className="text-xl font-semibold">Feature {index + 1}</h3>
				  </div>
				  <p className="text-muted-foreground">{featureText}</p>
				  <Separator className="my-4" />
				  <div className="flex items-center gap-2 text-sm">
					<span>Implementation Progress</span>
					<Progress value={completionPercentage} className="h-2 w-24" />
				  </div>
				</motion.div>
			  );
			})}
			</div>
		  </TabsContent>

		  <TabsContent value="architecture" className="mt-8">
			{project.architecture_diagram ? (
				<div className="space-y-4">
				<DiagramRenderer 
					diagram={project.architecture_diagram}
					type={project.diagram_type}
				/>
				<div className="text-sm text-muted-foreground">
					Diagram type: {project.diagram_type}
				</div>
				</div>
			) : (
				<div className="p-6 rounded-lg bg-muted">
				<p className="text-center text-foreground/50">
					Architecture diagram not available
				</p>
				</div>
			)}
			</TabsContent>

		  <TabsContent value="challenges" className="mt-8">
			<div className="grid md:grid-cols-2 gap-8">
			  <motion.div 
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
			  </motion.div>

			  <motion.div 
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
			  </motion.div>
			</div>

		  {project.development_steps && project.development_steps.length > 0 && (
			<div className="mt-12">
			  <h4 className="text-xl font-semibold mb-6">Development Timeline</h4>
			  <div className="relative pl-6 border-l-2 border-accent">
				{project.development_steps.map((step, index) => (
				  <motion.div
					key={index}
					className="mb-8 pl-6 relative"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: index * 0.1 }}
				  >
					<div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-2 border-2 border-background" />
					<h5 className="font-medium mb-2">{step.title}</h5>
					<p className="text-sm text-muted-foreground">{step.description}</p>
				  </motion.div>
				))}
			  </div>
			</div>
		  )}
		  </TabsContent>
		</motion.div>
	  </Tabs>

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
	</motion.div>
  );
}