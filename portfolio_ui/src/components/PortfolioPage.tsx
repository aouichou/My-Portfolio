// portfolio_ui/src/components/PortfolioPage.tsx

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';


interface SectionVisibility {
    [key: string]: boolean;
  }

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isVisible, setIsVisible] = useState<SectionVisibility>({});
  
  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
		useEffect(() => {
			const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
				setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
				}
			});
			}, {
			// Trigger earlier on small screens by checking window width
			threshold: window.innerWidth < 768 ? 0.05 : 0.2,
			rootMargin: window.innerWidth < 768 ? '0px 0px -10% 0px' : '0px',
			});
			
			document.querySelectorAll('section[id]').forEach(section => {
			observer.observe(section);
			});
			
			return () => observer.disconnect();
		}, []);

  return (
    
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-24 px-4">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <Link href="/projects" className="inline-flex items-center text-white hover:text-blue-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Projects
          </Link>
        </div>
        <div className="container mx-auto max-w-6xl">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Portfolio Architecture
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl mb-8 max-w-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Cloud-native modern architecture with interactive WebSocket terminal, distributed services, and automated CI/CD
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <a 
              href="https://github.com/aouichou/My-Portfolio" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-white text-blue-600 rounded-full font-medium hover:bg-opacity-90 transition-all"
            >
              View Source on GitHub
            </a>
          </motion.div>
        </div>
      </header>
      
      {/* Navigation tabs */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 shadow-md z-10 px-4 py-2">
        <div className="container mx-auto max-w-6xl">
          <div className="flex overflow-x-auto space-x-4 scrollbar-hide">
            {['overview', 'architecture', 'cloud', 'terminal', 'devops', 'security'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-6xl px-4 py-16">
        {/* Overview Section */}
        <section id="overview" className={activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['overview'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Portfolio Overview
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <div className="text-blue-600 text-4xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Modern Stack</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built with Next.js 15, TypeScript, Django 5, and WebSockets for real-time interaction.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="text-blue-600 text-4xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Cloud Native</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Deployed on Render and Heroku with distributed services, Redis for pub/sub, and S3 for storage.
              </p>
            </motion.div>
            
            <motion.div 
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <div className="text-blue-600 text-4xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Protected with WAF, rate limiting, and automatic health checks to ensure high availability.
              </p>
            </motion.div>
          </div>

          <div className="mt-16">
            <motion.h3 
              className="text-2xl font-bold mb-6"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Key Features
            </motion.h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div 
                className="flex gap-4 items-start"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['overview'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Interactive Terminal</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Live in-browser terminal that allows users to run and interact with projects in real-time.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex gap-4 items-start"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['overview'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Multi-Service Architecture</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Separated frontend, API, and terminal services for better scalability and isolation.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex gap-4 items-start"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['overview'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">CI/CD Pipeline</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Automated GitHub Actions workflows for continuous integration and deployment.
                  </p>
                </div>
              </motion.div>
              
              <motion.div 
                className="flex gap-4 items-start"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['overview'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Security First</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Implemented WAF, CSP headers, rate limiting, and sandbox environments for terminal sessions.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
          {/* Stats Section */}
          <div className="mt-16">
            <motion.h3 
              className="text-2xl font-bold mb-8 text-center"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              System Performance
            </motion.h3>
            
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['overview'] ? 'visible' : 'hidden'}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">98%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Lighthouse Score</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">120ms</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">0.02%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Error Rate</div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">99.9%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* Architecture Section */}
        <section id="architecture" className={activeTab === 'architecture' ? 'block' : 'hidden'}>
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['architecture'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Technical Architecture
          </motion.h2>
          
          <motion.div
            className="mb-16"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['architecture'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700">
  <div className="relative w-full" style={{ paddingTop: '56.25%' /* 16:9 aspect ratio */ }}>
    {/* Light Mode SVG */}
    <object
      data="/diagrams/architecture-diagram-light.svg"
      type="image/svg+xml"
      className="absolute top-0 left-0 w-full h-full dark:hidden"
      aria-label="System Architecture Diagram (Light Mode)"
    >
      {/* Fallback for unsupported browsers */}
      <img 
        src="/diagrams/architecture-diagram-light.png" 
        alt="System Architecture Diagram"
        className="w-full h-full"
      />
    </object>

    {/* Dark Mode SVG */}
    <object
      data="/diagrams/architecture-diagram-dark.svg"
      type="image/svg+xml"
      className="absolute top-0 left-0 w-full h-full hidden dark:block"
      aria-label="System Architecture Diagram (Dark Mode)"
    >
      <img 
        src="/diagrams/architecture-diagram-dark.png" 
        alt="System Architecture Diagram"
        className="w-full h-full"
      />
    </object>
  </div>
  <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
    Figure 1: System Architecture Diagram
  </div>
</div>
          </motion.div>
          
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['architecture'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold mb-6">Key Components</h3>
            
			<div className="grid md:grid-cols-3 gap-8">
			  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
				<h4 className="font-bold text-lg mb-2 text-blue-600">Frontend Service</h4>
				<ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
				  <li><span className="font-medium">Next.js 15</span> with TypeScript</li>
				  <li><span className="font-medium">Tailwind CSS</span> for styling</li>
				  <li><span className="font-medium">React Query</span> for data fetching</li>
				  <li>Deployed on <span className="font-medium">Heroku</span></li>
				  <li><span className="font-medium">Xterm.js</span> for terminal UI</li>
				</ul>
			  </div>
			  
			  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
				<h4 className="font-bold text-lg mb-2 text-blue-600">Backend Service</h4>
				<ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
				  <li><span className="font-medium">Django 5</span> REST API</li>
				  <li><span className="font-medium">Django Channels</span> for WebSockets</li>
				  <li><span className="font-medium">PostgreSQL</span> database</li>
				  <li><span className="font-medium">Redis</span> for caching/pub-sub</li>
				  <li><span className="font-medium">S3</span> storage for media</li>
				</ul>
			  </div>
			  
			  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
				<h4 className="font-bold text-lg mb-2 text-blue-600">Terminal Service</h4>
				<ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
				  <li><span className="font-medium">FastAPI</span> with WebSockets</li>
				  <li><span className="font-medium">PTY</span> process management</li>
				  <li>Sandboxed <span className="font-medium">Docker</span> environment</li>
				  <li>Command validation & security</li>
				  <li>Project file management</li>
				</ul>
			  </div>
			</div>
          </motion.div>
          
          <motion.div
            className="mt-16"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['architecture'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <h3 className="text-2xl font-bold mb-6">Data Flow</h3>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <ol className="list-decimal list-inside space-y-4 text-gray-600 dark:text-gray-300">
                <li>
                  <span className="font-semibold">Request Initiation:</span> User requests arrive through Cloudflare CDN, which provides edge caching and WAF protection.
                </li>
                <li>
                  <span className="font-semibold">API Handling:</span> Next.js frontend communicates with Django backend via REST API for project data.
                </li>
                <li>
                  <span className="font-semibold">WebSocket Connection:</span> For terminal sessions, the browser establishes a WebSocket connection to Django Channels.
                </li>
                <li>
                  <span className="font-semibold">Terminal Proxying:</span> Django forwards terminal commands to the isolated terminal service via internal WebSocket.
                </li>
                <li>
                  <span className="font-semibold">PTY Execution:</span> Terminal service executes commands in a sandboxed environment with resource limits.
                </li>
                <li>
                  <span className="font-semibold">Response Flow:</span> Command outputs flow back through the chain to the user's browser terminal.
                </li>
              </ol>
            </div>
          </motion.div>
        </section>

        {/* Cloud Deployment Section */}
        <section id="cloud" className={activeTab === 'cloud' ? 'block' : 'hidden'}>
            <motion.h2 
                className="text-3xl font-bold mb-8"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['cloud'] ? 'visible' : 'hidden'}
                transition={{ duration: 0.6 }}
            >
                Cloud Deployment Architecture
            </motion.h2>
            
            <motion.div
                className="mb-16"
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['cloud'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.1, duration: 0.6 }}
            >
<div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700">
  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
    {/* Light Mode SVG */}
    <object
      data="/diagrams/cloud-deployment-light.svg"
      type="image/svg+xml"
      className="absolute top-0 left-0 w-full h-full dark:hidden"
      aria-label="Cloud Deployment Architecture (Light Mode)"
    >
      <img 
        src="/diagrams/cloud-deployment-light.png" 
        alt="Cloud Deployment Architecture"
        className="w-full h-full"
      />
    </object>

    {/* Dark Mode SVG */}
    <object
      data="/diagrams/cloud-deployment-dark.svg"
      type="image/svg+xml"
      className="absolute top-0 left-0 w-full h-full hidden dark:block"
      aria-label="Cloud Deployment Architecture (Dark Mode)"
    >
      <img 
        src="/diagrams/cloud-deployment-dark.png" 
        alt="Cloud Deployment Architecture"
        className="w-full h-full"
      />
    </object>
  </div>
  <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
    Figure 2: Cloud Deployment Architecture
  </div>
{/* </div> */}
                <div className="mt-8">
                    <h4 className="font-bold mb-4">Multi-Cloud Strategy Benefits</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li><span className="font-medium">Provider Specialization</span>: Each service runs on the platform best suited for it</li>
                        <li><span className="font-medium">Cost Optimization</span>: Leveraging free tiers across multiple providers</li>
                        <li><span className="font-medium">Vendor Lock-in Avoidance</span>: Distributed across multiple cloud providers</li>
                        <li><span className="font-medium">Increased Reliability</span>: Reduced risk of single provider outages</li>
                        </ul>
                    </div>
                    <div>
                        <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li><span className="font-medium">Service Isolation</span>: Each component can scale independently</li>
                        <li><span className="font-medium">Security Compartmentalization</span>: Limited access between services</li>
                        <li><span className="font-medium">Geographic Distribution</span>: Services closer to their dependencies</li>
                        <li><span className="font-medium">Custom Optimization</span>: Each service configured optimally for its platform</li>
                        </ul>
                    </div>
                    </div>
                </div>
                </div>
            </motion.div>
            
            <motion.div
                variants={fadeIn}
                initial="hidden"
                animate={isVisible['cloud'] ? 'visible' : 'hidden'}
                transition={{ delay: 0.2, duration: 0.6 }}
            >
                <h3 className="text-2xl font-bold mb-6">Platform-Specific Optimizations</h3>
                
                <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h4 className="font-bold text-lg mb-2 text-blue-600">Heroku Optimizations</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Build cache for faster deployments</li>
                    <li>Brotli compression for assets</li>
                    <li>Automatic HTTPS certification</li>
                    <li>Eco dyno for cost efficiency</li>
                    <li>Integrated logging and monitoring</li>
                    </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h4 className="font-bold text-lg mb-2 text-blue-600">Render Optimizations</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Private service networking</li>
                    <li>Persistent disk for terminal sessions</li>
                    <li>Zero-downtime deployments</li>
                    <li>Custom deployment scripts</li>
                    <li>Automated health checks</li>
                    </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h4 className="font-bold text-lg mb-2 text-blue-600">AWS Integrations</h4>
                    <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>S3 for persistent media storage</li>
                    <li>CloudFront for global asset delivery</li>
                    <li>IAM roles for secure access</li>
                    <li>Versioned object storage</li>
                    <li>Lifecycle rules for cost management</li>
                    </ul>
                </div>
                </div>
            </motion.div>

			<motion.div
			className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800/30 shadow-sm"
			variants={fadeIn}
			initial="hidden"
			animate={isVisible['cloud'] ? 'visible' : 'hidden'}
			transition={{ delay: 0.3, duration: 0.6 }}
			>
			<h3 className="text-2xl font-bold mb-4">My Architecture Choices</h3>
			<p className="text-gray-700 dark:text-gray-300 mb-4">
				When designing this portfolio, I made deliberate architectural choices that balance modern web best practices with practical constraints:
			</p>
			<div className="space-y-4">
				<div>
				<h4 className="font-semibold text-blue-700 dark:text-blue-300">Why a Multi-Service Architecture?</h4>
				<p className="text-gray-600 dark:text-gray-400">
					I chose to split the application across multiple services to demonstrate microservice principles while keeping each component focused on its core responsibility. This separation allowed me to select the best technology for each specific need - Next.js for a snappy UI, Django for a robust API, and a dedicated terminal service for secure command execution.
				</p>
				</div>
				<div>
				<h4 className="font-semibold text-blue-700 dark:text-blue-300">Why These Technologies?</h4>
				<p className="text-gray-600 dark:text-gray-400">
					My technology stack reflects my full-stack expertise. I selected Next.js and React for frontend as they provide the best developer experience and performance. For backend, Django offers a mature ecosystem with excellent security features. I added Redis for inter-service communication and PostgreSQL for robust data storage. This combination delivers high performance while showcasing my versatility across the stack.
				</p>
				</div>
				<div>
				<h4 className="font-semibold text-blue-700 dark:text-blue-300">My Cloud Deployment Strategy</h4>
				<p className="text-gray-600 dark:text-gray-400">
					Rather than using a single cloud provider, I intentionally distributed services across multiple platforms to optimize cost efficiency and demonstrate multi-cloud orchestration skills. This approach also avoids vendor lock-in and allows each component to run in its most suitable environment.
				</p>
				</div>
			</div>
			</motion.div>
			</section>

        {/* Terminal Section */}
        <section id="terminal" className={activeTab === 'terminal' ? 'block' : 'hidden'}>
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['terminal'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Interactive Terminal
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-16">
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['terminal'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold mb-4">Interactive Code Execution</h3>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                  The terminal feature allows users to interact with project code directly in the browser. This provides:
                </p>
        
                <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300 mb-6">
                  <li>Hands-on experience with project functionality</li>
                  <li>Ability to test commands and see outputs in real-time</li>
                  <li>Understanding of project structure and workflow</li>
                  <li>Deeper engagement than static code samples</li>
                </ul>
        
                <h4 className="font-semibold mb-2">Example Commands:</h4>
                <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm overflow-auto mb-4">
                  {`$ cd projects/minirt
        $ make
        $ ./miniRT scenes/demo.rt
        # Renders a raytraced image directly in the terminal`}
                </pre>
        
                <div className="text-right">
                  <Link href="/demo/minishell" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    Try the terminal demo →
                  </Link>
                </div>
              </div>
            </motion.div>
        
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['terminal'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold mb-4">Terminal Implementation</h3>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h4 className="font-semibold mb-2">WebSocket Protocol Flow:</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                  <ol className="list-decimal list-inside space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <li>Browser connects to Django backend via secure WebSocket</li>
                    <li>Django validates user permissions & project access</li>
                    <li>Backend connects to internal terminal service</li>
                    <li>Terminal service spawns PTY process in sandbox</li>
                    <li>User input is forwarded through the chain</li>
                    <li>Terminal output streams back in real-time</li>
                  </ol>
                </div>
                
                <h4 className="font-semibold mb-2">Security Measures:</h4>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-300 mb-6">
                  <li>Command allowlist with regex validation</li>
                  <li>Resource limits (512MB RAM, 2 CPU cores)</li>
                  <li>30-minute session timeout</li>
                  <li>Read-only filesystem (except project directories)</li>
                </ul>
                
                <h4 className="font-semibold mb-2">Key Technologies:</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Django Channels", "Redis", "PTY.js", "WebSockets", "Docker", "Xterm.js"].map(tech => (
                    <span key={tech} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-200">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
        
        {/* DevOps Section */}
        <section id="devops" className={activeTab === 'devops' ? 'block' : 'hidden'}>
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['devops'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            DevOps & Infrastructure
          </motion.h2>
          
          <motion.div
            className="mb-12"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['devops'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4">CI/CD Pipeline</h3>
              
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded text-center">
                      <p className="font-bold">Code Push</p>
                    </div>
                    <div className="p-4 bg-green-100 dark:bg-green-900 rounded text-center">
                      <p className="font-bold">GitHub Actions</p>
                    </div>
                    <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded text-center">
                      <p className="font-bold">Tests & Validation</p>
                    </div>
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded text-center">
                      <p className="font-bold">Build Containers</p>
                    </div>
                    <div className="p-4 bg-red-100 dark:bg-red-900 rounded text-center">
                      <p className="font-bold">Deploy</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center mb-8">
                    <div className="h-0.5 bg-gray-400 dark:bg-gray-600 w-full mt-3"></div>
                  </div>
                </div>
              </div>
              
              <h4 className="font-semibold mb-2">Key Features:</h4>
              <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                <li><span className="font-medium">Path Filtering</span>: Only rebuild and deploy services affected by changes</li>
                <li><span className="font-medium">Automatic Database Migrations</span>: Safe application of schema changes</li>
                <li><span className="font-medium">Force Deploy Flag</span>: Deploy all services with commit message flag [deploy-all]</li>
                <li><span className="font-medium">Rollback Support</span>: Quick rollback to previous version if needed</li>
              </ul>
            </div>
          </motion.div>
          
          <motion.div
            className="grid md:grid-cols-2 gap-8 mb-12"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['devops'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4">Infrastructure as Code</h3>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm overflow-auto mb-4">
                {`# Docker Compose for local development
        version: '3.8'
        
        services:
          frontend:
            build: ./portfolio_ui
            ports:
              - "3000:3000"
            volumes:
              - ./portfolio_ui:/app
              
          backend:
            build: ./portfolio_api
            ports:
              - "8000:8000"
            env_file: .env
            depends_on:
              - postgres
              - redis
              
          terminal:
            build: ./portfolio-terminal
            ports:
              - "8001:8001"
            env_file: .env
            volumes:
              - project_files:/home/coder/projects
              
          postgres:
            image: postgres:15
            volumes:
              - postgres_data:/var/lib/postgresql/data
              
          redis:
            image: redis:7-alpine
            
        volumes:
          postgres_data:
          project_files:`}
              </pre>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4">Service Health Monitoring</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                To prevent free-tier services from shutting down due to inactivity, a mutual health check system was implemented:
              </p>
              
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-sm overflow-auto mb-4">
                {`# Django App Config - Health Checks
        def ready(self):
            if os.environ.get('RUN_MAIN') != 'true':
                def check_services_health():
                    """Ping other services to keep them alive"""
                    services = {
                        "terminal": os.environ.get(
                            "TERMINAL_SERVICE_URL"
                        ),
                        "frontend": os.environ.get(
                            "FRONTEND_URL"
                        )
                    }
                    
                    for name, url in services.items():
                        try:
                            response = requests.get(
                                f"{url}/healthz",
                                timeout=5
                            )
                            logger.info(
                                f"{name} health check: {response.status_code}"
                            )
                        except Exception as e:
                            logger.error(
                                f"{name} health check failed: {str(e)}"
                            )
                            
                # Schedule health checks
                scheduler = BackgroundScheduler()
                scheduler.add_job(
                    check_services_health,
                    'interval',
                    minutes=15
                )
                scheduler.start()`}
              </pre>
            </div>
          </motion.div>
          
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['devops'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4">Cloud Provider Integration</h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Render</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>Django backend web service</li>
                    <li>Terminal service (internal only)</li>
                    <li>PostgreSQL database</li>
                    <li>Redis cache service</li>
                    <li>Private networking between services</li>
                  </ul>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Heroku</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>Next.js frontend</li>
                    <li>Node.js runtime</li>
                    <li>Automatic HTTPS</li>
                    <li>SSL certificate management</li>
                    <li>Custom domain support</li>
                  </ul>
                </div>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">AWS</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                    <li>S3 storage for media files</li>
                    <li>CloudFront for CDN delivery</li>
                    <li>IAM for access management</li>
                    <li>Custom storage adapters</li>
                    <li>Secure uploads and downloads</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
        
        {/* Security Section */}
        <section id="security" className={activeTab === 'security' ? 'block' : 'hidden'}>
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['security'] ? 'visible' : 'hidden'}
            transition={{ duration: 0.6 }}
          >
            Security & Reliability
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['security'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-full">
                <h3 className="text-xl font-bold mb-4">Web Application Security</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Content Security Policy</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Strict CSP headers prevent XSS attacks by controlling resource loading.
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1 overflow-auto">
                      {`Content-Security-Policy: default-src 'self';
        script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https://*.amazonaws.com;
        connect-src 'self' wss://*.aouichou.me api.aouichou.me;`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Rate Limiting Middleware</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      API endpoints are protected from abuse with rate limiting.
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1 overflow-auto">
                      {`class RateLimitMiddleware:
            def __init__(self, get_response):
                self.get_response = get_response
                self.r = redis.Redis.from_url(settings.REDIS_URL)
                self.rate_limit = 60  # requests per minute
                
            def __call__(self, request):
                if not settings.DEBUG:
                    ip = self.get_client_ip(request)
                    key = f"ratelimit:{ip}:{int(time.time() / 60)}"
                    
                    requests = self.r.incr(key)
                    self.r.expire(key, 60)
                    
                    if requests > self.rate_limit:
                        return JsonResponse(
                            {"error": "Rate limit exceeded"},
                            status=429
                        )
                        
                return self.get_response(request)`}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate={isVisible['security'] ? 'visible' : 'hidden'}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-full">
                <h3 className="text-xl font-bold mb-4">Terminal Security</h3>
                
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Running interactive terminals in the browser presents unique security challenges. The following measures were implemented:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Command Validation</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      All terminal input is validated against an allowlist of safe commands.
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1 overflow-auto">
                      {`# Allowed commands and patterns
        ALLOWED_COMMANDS = [
            r"^ls(\s+-[altrh1]+)?(\s+[\w./\-]+)?$",
            r"^cd(\s+[\w./\-]+)?$",
            r"^cat\s+[\w./\-]+$",
            r"^make(\s+[\w\-]+)?$",
            r"^gcc\s+[\w./\-]+\.c(\s+\-[o\w]+)?$",
            r"^./[\w\-]+(\s+[\w./\-]+)?$",
            # Additional safe commands...
        ]
        
        def is_command_allowed(cmd):
            return any(re.match(pattern, cmd) for pattern in ALLOWED_COMMANDS)`}
                    </pre>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Container Isolation</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Each terminal session runs in an isolated container with limited resources.
                    </p>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1 overflow-auto">
                      {`# Resource limits
        CONTAINER_CONFIG = {
            "memory": "512m",
            "memory-swap": "512m",
            "cpus": "2",
            "pids-limit": 100,
            "network-mode": "none",  # No network access
            "read-only": True,       # Read-only filesystem
            "tmpfs": {               # Writable temp directories
                "/tmp": "rw,noexec,nosuid,size=100m",
                "/home/coder/projects": "rw,noexec,nosuid,size=100m"
            }
        }`}
                    </pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            className="mt-8"
            variants={fadeIn}
            initial="hidden"
            animate={isVisible['security'] ? 'visible' : 'hidden'}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-bold mb-4">Reliability Features</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Error Handling & Reporting</h4>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Structured logging with severity levels</li>
                    <li>Automatic error reporting to admin</li>
                    <li>User-friendly error messages</li>
                    <li>Session recovery for interrupted connections</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Backup & Disaster Recovery</h4>
                  <ul className="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Daily database backups</li>
                    <li>Versioned S3 storage for media files</li>
                    <li>Configuration stored as environment variables</li>
                    <li>Infrastructure as code for quick recovery</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Automated Testing</h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Comprehensive test suite ensures system reliability and prevents regressions.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                    <div className="text-lg font-bold">95%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Backend Coverage</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                    <div className="text-lg font-bold">89%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Frontend Coverage</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                    <div className="text-lg font-bold">132</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">Integration Tests</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded">
                    <div className="text-lg font-bold">24</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">E2E Tests</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
        </main>
        </div>
  );
}