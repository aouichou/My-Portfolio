// portfolio_ui/src/components/TranscendenceProject.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProjectBySlug } from '@/library/queries';
import ClientImage from './ClientImage';
import { Project } from '@/library/types';
import { API_URL } from '@/library/api-client';

// Updated paths to match your actual S3 structure
const GIF_PATHS = [
  'galleries/2025/04/09/demo-42Oauth.gif',
  'galleries/2025/04/09/demo-lobby.gif',
  'galleries/2025/04/09/demo_match.gif',
  'galleries/2025/04/09/demo-match_vs_IA.gif'
];

const IMAGE_PATHS = [
  'galleries/2025/04/09/first_page.png',
  'galleries/2025/04/09/lobby1.png',
  'galleries/2025/04/09/lobby2.png',
  'galleries/2025/04/09/login.png',
  'galleries/2025/04/09/playscreen.png',
  'galleries/2025/04/09/redirect.png',
  'galleries/2025/04/09/signup.png',
  'galleries/2025/04/09/workstation_pc_in_lobby.png'
];

const MotionSection = motion.section;

// Image Lightbox Component
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] p-2">
        <button 
          className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70 transition-all"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img 
          src={`/api/image-proxy?url=${encodeURIComponent(`https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579/${src}`)}`}
          alt={alt} 
          className="max-h-[85vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

export function TranscendenceProject({ initialProject }: { initialProject?: Project }) {
  const { data: project } = useProjectBySlug('ft_transcendence', initialProject);
  const [currentGif, setCurrentGif] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState("");

  // Auto-rotate GIFs
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGif((prev) => (prev + 1) % GIF_PATHS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle opening the lightbox
  const openLightbox = (src: string, alt: string) => {
    setLightboxImage(src);
    setLightboxAlt(alt);
    // Prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  };

  // Handle closing the lightbox
  const closeLightbox = () => {
    setLightboxImage(null);
    // Restore scrolling when lightbox is closed
    document.body.style.overflow = 'auto';
  };
  
  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">Loading project...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Lightbox */}
      {lightboxImage && (
        <ImageLightbox 
          src={lightboxImage} 
          alt={lightboxAlt} 
          onClose={closeLightbox} 
        />
      )}

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-24 px-4">
        <div className="container mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white text-center mb-6"
          >
            {project.title}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-white/90 text-center max-w-3xl mx-auto mb-8"
          >
            Real-time Pong-inspired web app featuring tournaments, AI opponents, secure user management, and a microservices-based backend
          </motion.p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {project.live_url && (
              <motion.a
                href={project.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all border border-white/20"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-xl">🚀</span>
                Visit Live Site
              </motion.a>
            )}
            
            {project.code_url && (
              <motion.a
                href={project.code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 hover:bg-gray-100 rounded-full transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <span className="text-xl">💻</span>
                Source Code
              </motion.a>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Left Column - Demo GIFs */}
          <motion.div 
            className="md:col-span-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-8 text-blue-900 dark:text-blue-100">Live Demo Showcase</h2>
            
            {/* Feature GIF with pagination dots - Use image proxy URL directly */}
            <div className="relative rounded-xl overflow-hidden shadow-xl mb-6">
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={`/api/image-proxy?url=${encodeURIComponent(`https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579/${GIF_PATHS[currentGif]}`)}`}
                  alt={`Transcendence Demo ${currentGif + 1}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/fallback-image.jpg';
                    console.log(`Failed to load: ${GIF_PATHS[currentGif]}`);
                  }}
                />
              </div>
              
              {/* Pagination dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {GIF_PATHS.map((_, i) => (
                  <button
                    key={i}
                    className={`h-3 w-3 rounded-full ${
                      i === currentGif ? 'bg-blue-600' : 'bg-gray-400'
                    }`}
                    onClick={() => setCurrentGif(i)}
                  />
                ))}
              </div>
            </div>
            
            {/* Gallery Grid - With clickable images */}
            <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Screenshots Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {IMAGE_PATHS.map((path, index) => (
                <motion.div
                  key={index}
                  className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  onClick={() => openLightbox(path, `Transcendence Screenshot ${index + 1}`)}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                    <img
                      src={`/api/image-proxy?url=${encodeURIComponent(`https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579/${path}`)}`}
                      alt={`Transcendence Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/fallback-image.jpg';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center transition-all">
                      <div className="bg-white bg-opacity-0 hover:bg-opacity-80 p-2 rounded-full transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-transparent hover:text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Column - Technical Info */}
          <motion.div
            className="md:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold mb-6 text-blue-900 dark:text-blue-100">My Contributions</h2>
            
            <div className="space-y-8">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-3 text-blue-600 dark:text-blue-400">Backend API</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Designed RESTful API architecture with Django</li>
                  <li>Implemented JWT authentication system</li>
                  <li>Created tournament bracket management system</li>
                  <li>Built user profile and social features</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-3 text-purple-600 dark:text-purple-400">DevOps</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Set up Docker containerization for all services</li>
                  <li>Configured Nginx-based reverse proxy</li>
                  <li>Automated deployment with GitHub Actions</li>
                  <li>Managed TLS/SSL security configuration</li>
                </ul>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-bold mb-3 text-green-600 dark:text-green-400">Microservices Architecture</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                  <li>Designed multi-container architecture</li>
                  <li>Implemented WebSocket service for real-time gameplay</li>
                  <li>Created dedicated CDN container for static assets</li>
                  <li>Developed inter-service communication patterns</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold mb-3">Technologies Used</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tech_stack?.map((tech, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              
              {project.live_url && (
                <a
                  href={project.live_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl text-center font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  Visit Live Site →
                </a>
              )}
            </div>
          </motion.div>
        </div>
        
        {/* Features Section */}
        <MotionSection
          className="mt-24"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold mb-8 text-center">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-blue-500 text-3xl mb-4">👤</div>
              <h3 className="text-xl font-bold mb-3">User Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                OAuth2 with 42, user registration, profile management, 2FA & JWT sessions
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-blue-500 text-3xl mb-4">🎮</div>
              <h3 className="text-xl font-bold mb-3">Real-time Gameplay</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Synchronous gameplay using WebSockets, AI opponents, tournaments with brackets
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="text-blue-500 text-3xl mb-4">🛠️</div>
              <h3 className="text-xl font-bold mb-3">DevOps Excellence</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Docker containers, Nginx reverse proxy, automated TLS/HTTPS config
              </p>
            </div>
          </div>
        </MotionSection>
      </div>
    </div>
  );
}
