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
  }, [images.length]);

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
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
          >
            ←
          </button>
          <button
            onClick={() => { setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0)); }}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}