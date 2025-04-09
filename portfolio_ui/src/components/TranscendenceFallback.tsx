// portfolio_ui/src/components/TranscendenceFallback.tsx

import Link from 'next/link';

export default function TranscendenceFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent">
            ft_transcendence Project
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            We encountered a problem loading this project's details. Please try again later.
          </p>
          
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Try Again
            </button>
            <Link 
              href="/projects" 
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full transition-all"
            >
              View Other Projects
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">About ft_transcendence</h2>
          <p className="mb-6">
            ft_transcendence is a real-time multiplayer Pong game with a modern web interface. 
            It features user authentication, tournament systems, and live gameplay using WebSockets.
          </p>
          
          <h3 className="text-xl font-bold mb-3">Key Features:</h3>
          <ul className="list-disc pl-6 space-y-2 mb-6">
            <li>Real-time multiplayer gameplay</li>
            <li>OAuth authentication system</li>
            <li>Tournament brackets and matchmaking</li>
            <li>User profiles and stats tracking</li>
            <li>Microservices architecture</li>
          </ul>
        </div>
      </div>
    </div>
  );
}