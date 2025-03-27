// portfolio_ui/src/components/TranscendenceProject.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProjectBySlug } from '@/library/queries';
import ClientImage from './ClientImage';
import { Project } from '@/library/types';
import { getMediaUrl } from '@/library/s3-config';

// Use getMediaUrl for all images
const getImagePath = (filename: string) => 
  getMediaUrl(`projects/ft_transcendence/${filename}`);

// Define image paths using the helper function
const GIF_PATHS = [
  getImagePath('demo-42Oauth.gif'),
  getImagePath('demo-lobby.gif'),
  getImagePath('demo_match.gif'),
  getImagePath('demo-match_vs_IA.gif')
];

const IMAGE_PATHS = [
  getImagePath('first_page.png'),
  getImagePath('lobby1.png'),
  getImagePath('lobby2.png'),
  getImagePath('login.png'),
  getImagePath('playscreen.png'),
  getImagePath('redirect.png'),
  getImagePath('signup.png'),
  getImagePath('workstation_pc_in_lobby.png')
];

const MotionTitle = motion.h1;
const MotionSection = motion.section;

export function TranscendenceProject({ initialProject }: { initialProject?: Project }) {
  const { data: project } = useProjectBySlug('ft_transcendence', initialProject);
  const [currentGif, setCurrentGif] = useState(0);

  // Auto-rotate GIFs
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGif((prev) => (prev + 1) % GIF_PATHS.length);
    }, 10000); // Change every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (!project) {
    return <div className="flex items-center justify-center min-h-screen">Loading project...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-24 px-4">
        <div className="container mx-auto">
          <MotionTitle
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white text-center mb-6"
          >
            ft_transcendence
          </MotionTitle>
          
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
                className="btn-white-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                Visit Live Site
              </motion.a>
            )}
            
            {project.code_url && (
              <motion.a
                href={project.code_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline-white-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                GitHub Repository
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
            
            {/* Feature GIF with pagination dots */}
            <div className="relative rounded-xl overflow-hidden shadow-xl mb-6">
              <ClientImage
                src={GIF_PATHS[currentGif]}
                alt="Transcendence Demo"
                width={800}
                height={450}
                className="w-full object-cover"
                fallbackSrc="/placeholder.png"
              />
              
              {/* Pagination dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {GIF_PATHS.map((_, i) => (
                  <button
                    key={i}
                    className={`h-3 w-3 rounded-full ${
                      i === currentGif ? 'bg-white' : 'bg-white/50'
                    }`}
                    onClick={() => setCurrentGif(i)}
                  />
                ))}
              </div>
            </div>
            
            {/* Gallery Grid */}
            <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Screenshots Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {IMAGE_PATHS.map((path, index) => (
                <motion.div
                  key={index}
                  className="rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                >
                  <ClientImage
                    src={path}
                    alt={`Transcendence Screenshot ${index + 1}`}
                    width={400}
                    height={225}
                    className="w-full h-auto"
                    fallbackSrc="/placeholder.png"
                  />
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