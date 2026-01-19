// portfolio_ui/src/components/ProjectDetail.tsx

'use client';

import { useProjectBySlug } from '@/library/queries';
import React from 'react';
import ReactMarkdown from 'react-markdown';
// import {Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/tabs';
import ClientImage from '@/components/ClientImage';
import { CodeWindow } from '@/components/CodeWindow';
import { GithubContributions } from '@/components/GithubContributions';
import ImageCarousel from '@/components/ImageCarousel';
import { MotionDiv, MotionH1 } from '@/components/Motion';
import { Progress } from '@/components/ui/progress';
import { Gallery, GalleryImage, Project } from '@/library/types';
import { useState } from 'react';
// import { Lightbox } from '@/components/Lightbox';
import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
import CodeWalkthrough from '@/components/CodeWalkthrough';
import { Icons } from '@/components/Icons';
import { MermaidComponent } from '@/components/MermaidComponent';
import ScrollToTop from '@/components/ScrollToTop';
import DOMPurify from 'dompurify';
import Link from 'next/link';
import { useEffect } from 'react';

interface ProjectDetailProps {
  slug: string;
  initialProject?: Project;
}

const DiagramRenderer = ({ diagram, type }: { diagram: string; type: string }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (type === 'SVG' && divRef.current && diagram) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(diagram, 'image/svg+xml');
      const svgElement = doc.documentElement;
      if (svgElement.tagName === 'svg') {
        divRef.current.textContent = '';
        divRef.current.appendChild(svgElement);
      }
    }
  }, [diagram, type]);
  
  if (!diagram) {
    return null;
  }
  
  if (type === 'MERMAID') {
    // Remove any leading/trailing whitespace and remove indentation
    const cleanedDiagram = diagram
      .trim()
      .replace(/^\s+/gm, '')
      .replace(/\[([\w\s\.-]+)\]/g, '("$1")');
    
    return (
      <div className="w-full">
        <MermaidComponent chart={cleanedDiagram} />
      </div>
    );
  }
  
  if (type === 'SVG') {
    // Use DOMPurify to sanitize SVG content
    const SvgComponent = () => {
      const divRef = React.useRef<HTMLDivElement>(null);
      React.useEffect(() => {
        if (divRef.current && diagram) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(diagram, 'image/svg+xml');
          const svgElement = doc.documentElement;
          if (svgElement.tagName === 'svg') {
            const sanitized = DOMPurify.sanitize(svgElement.outerHTML, { USE_PROFILES: { svg: true, svgFilters: true } });
            divRef.current.innerHTML = sanitized;
          }
        }
      }, []);
      return <div ref={divRef} />;
    };
    return <SvgComponent />;
  }

  if (type === 'ASCII') {
    return <pre className="font-mono bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">{diagram}</pre>;
  }

  return (
    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
      <p className="text-yellow-800 dark:text-yellow-200">
        Unsupported diagram type: {type}
      </p>
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
  const [showBanner, setShowBanner] = useState(false);


	useEffect(() => {
		// Force rendering of diagrams when project data is loaded
		if (project?.architecture_diagram) {
			void setTimeout(() => {
			if (window.renderMermaidDiagrams) {
				void window.renderMermaidDiagrams();
			}
			}, 1000);
		}
		}, [project]);

	useEffect(() => {
		const handleScroll = () => {
			const scrollPosition = window.scrollY;
			const pageHeight = document.body.scrollHeight - window.innerHeight;
			const scrollPercentage = (scrollPosition / pageHeight) * 100;
			
			// Show banner when scrolled past 80%
			setShowBanner(scrollPercentage > 80);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => { window.removeEventListener('scroll', handleScroll); };
    }, []); 

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
          className="text-6xl font-bold bg-linear-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent mb-6"
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
                className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg transition-all"
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
    <section className="my-12 p-8 rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/30 shadow-lg">
      <h2 className="text-3xl font-bold mb-6 text-blue-900 dark:text-blue-100">Project Overview</h2>
      <MotionDiv 
        className="prose prose-lg dark:prose-invert max-w-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <ReactMarkdown components={{
          img: ({ node, ...props }) => (
            <ImageComponent src={typeof props.src === 'string' ? props.src : undefined} alt={props.alt} />
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
            {project.development_steps.map((step: { title: string; description: string }, index: number) => (
              <MotionDiv
                key={index}
                className="mb-8 pl-6 relative"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="absolute w-4 h-4 bg-primary rounded-full -left-2.25 top-2 border-2 border-background" />
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
		
		{/* Installation Steps */}
		{project.code_steps && (
		  <section className="my-16">
			<h2 className="text-3xl font-bold mb-8">Installation Guide</h2>
			<div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl">
			  <ol className="list-decimal list-inside space-y-4 ml-4">
				{(() => {
				  // Handle different possible formats of code_steps
				  try {
					// If it's a single object with numerical keys (most likely case)
					if (project.code_steps && typeof project.code_steps === 'object') {
					  // Check if it has a '0' key that contains the actual steps
					  if ('0' in project.code_steps) {
						const realSteps = project.code_steps['0'];
						if (typeof realSteps === 'object') {
						  return Object.entries(realSteps).map(([step, instruction]) => (
							<li key={step} className="text-lg">
						  <span className="font-medium">{step}:</span>{" "}
						  {typeof instruction === 'string' 
                                ? instruction.split(/(`[^`]+`)/).map((part, i) => 
                                    part.startsWith('`') && part.endsWith('`') 
                                      ? <code key={i}>{part.slice(1, -1)}</code>
                                      : <span key={i}>{part}</span>
                                  )
                                : String(instruction)}
							</li>
						  ));
						}
					  }
					  
					// Regular object with step entries
					return Object.entries(project.code_steps).map(([step, instruction]) => (
					  <li key={step} className="text-lg">
						{/* Don't show the number if it's numeric - let the <ol> handle numbering */}
						{isNaN(Number(step)) ? <span className="font-medium">{step}:</span> : ""}{" "}
						{typeof instruction === 'string' 
						  ? <span dangerouslySetInnerHTML={{ 
							  __html: instruction.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-red-600 dark:text-red-400 font-mono text-sm">$1</code>') 
							}} />
						  : String(instruction)}
					  </li>
					));

					}

					return <li>Installation steps not available</li>;
				  } catch (error) {
					console.error("Error parsing installation steps:", error);
					return <li>Error displaying installation steps</li>;
				  }
				})()}
			  </ol>
			</div>
		  </section>
		)}
		
		{/* Code Walkthrough using code_snippets */}		
		{project.code_snippets && Object.keys(project.code_snippets).length > 0 && (
		  <section className="my-16">
			<h2 className="text-3xl font-bold mb-8">Code Walkthrough</h2>
			<CodeWalkthrough 
			  projectTitle={project.title}
			  steps={Object.entries(project.code_snippets).map(([key, value]) => {
				// Handle both old format (string) and new format (object)
				if (typeof value === 'string') {
				  return {
					code: value,
					title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
					description: `Implementation of ${key.replace(/_/g, ' ')} in the ${project.title} project.`,
					explanation: "",
					language: "c" 
				  };
				} else if (value && typeof value === 'object') {
				  // Make sure each required property exists and is a string
				  const safeValue = {
					code: typeof value.code === 'string' ? value.code : JSON.stringify(value.code),
					title: typeof value.title === 'string' ? value.title : key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
					description: typeof value.description === 'string' ? value.description : `Implementation of ${key.replace(/_/g, ' ')}`,
					explanation: typeof value.explanation === 'string' ? value.explanation : "",
					language: typeof value.language === 'string' ? value.language : "c" 
				  };
				  return safeValue;
				} else {
				  // Fallback for any unexpected format
				  console.warn(`Unexpected code snippet format for key: ${key}`, value);
				  return {
					code: JSON.stringify(value, null, 2),
					title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
					description: `Code snippet for ${key.replace(/_/g, ' ')}`,
					explanation: "",
					language: "json"
				  };
				}
			  })}
			/>
		  </section>
		)}

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

        {/* Live Demo Banner - Only show if has_interactive_demo is true */}
        {project.has_interactive_demo && showBanner && (
			<MotionDiv 
				initial={{ y: 100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				className="fixed bottom-0 left-0 right-0 bg-linear-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center z-50"
			>
				<div className="flex items-center gap-2">
				<span className="text-2xl">✨</span>
				<span className="font-medium">Interactive Terminal Demo Available</span>
				</div>
				<Link
				href={`/demo/${slug}`}
				className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
				>
				<span className="text-xl">🚀</span>
				Launch Demo
				</Link>
			</MotionDiv>
			)}
        
        {/* demo page */}
        {project.has_interactive_demo && (
        <section className="my-16">
            <h2 className="text-3xl font-bold mb-8 text-blue-900 dark:text-blue-100">Interactive Demo</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Try {project.title} in your browser</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                Experience this project with our interactive terminal simulator.
                No installation required!
                </p>
                <Link
                href={`/demo/${slug}`}
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all"
                >
                <div className="h-5 w-5">
                    <Icons.terminal />
                </div>
                Open Terminal Demo
                </Link>
            </div>
            </div>
        </section>
        )}
      <ScrollToTop />
    </MotionDiv>
  );
}