// components/ImageCarousel.tsx

'use client';

import { useEffect, useState } from 'react';
import ClientImage from './ClientImage';

export default function ImageCarousel({ images }: { images: Array<{ image: string; caption?: string }> }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); };
  }, [currentIndex, images.length, onClose]);

  return (
    <div className="relative group">
      <div className="relative aspect-video rounded-xl overflow-hidden">
		<ClientImage
		  src={images[currentIndex].image}
		  alt={images[currentIndex].caption || 'Project screenshot'}
		  fill
		  className="object-cover"
		  fallbackSrc="/fallback-image.jpg"
		  unoptimized
		/>
        
        {images[currentIndex].caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-white text-sm">{images[currentIndex].caption}</p>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
          <button
            onClick={() => { setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1)); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all z-10"
          >
            ←
          </button>
          <button
            onClick={() => { setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0)); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-800/90 p-3 rounded-full shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-all z-10"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}