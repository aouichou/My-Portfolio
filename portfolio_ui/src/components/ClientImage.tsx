// portfolio_ui/src/components/ClientImage.tsx

"use client";

import { getMediaUrl } from '@/library/s3-config';
import { useEffect, useState } from 'react';

type ClientImageProps = {
  src?: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  [key: string]: unknown;
};

export default function ClientImage({ 
  src, 
  alt = "", 
  className, 
  width, 
  height,
  ...props 
}: ClientImageProps) {
  // Process the source URL
  const processedSrc = src ? getMediaUrl(src) : '/fallback-image.jpg';
  
  // Use state to track image loading
  const [imgSrc, setImgSrc] = useState<string>(processedSrc);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [attempts, setAttempts] = useState<number>(0);

  // Handle image loading errors
  const handleError = () => {
    console.error(`Image failed to load: ${imgSrc}`);
    
    if (attempts < 2) {
      // Try one more time with a small delay
      setTimeout(() => {
        setAttempts(prev => prev + 1);
        // Try a different approach on second attempt
        if (attempts === 0 && src) {
          const directUrl = src.startsWith('http') 
            ? src 
            : `https://s3.eu-west-1.amazonaws.com/bucketeer-0a244e0e-1266-4baf-88d1-99a1b4b3e579/${src.replace(/^\//, '')}`;
          setImgSrc(directUrl);
        }
      }, 1000);
    } else {
      // After final attempt, use fallback
      setImgSrc('/fallback-image.jpg');
      setIsLoading(false);
    }
  };

  // Effect to load image
  useEffect(() => {
    if (!src) {
      setImgSrc('/fallback-image.jpg');
      setIsLoading(false);
      return;
    }

    // Reset state when src changes
    if (processedSrc !== imgSrc) {
      setImgSrc(processedSrc);
      setAttempts(0);
      setIsLoading(true);
    }

    const img = new Image();
    img.src = processedSrc;
    
    img.onload = () => {
      setIsLoading(false);
    };
    
    img.onerror = handleError;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, processedSrc, imgSrc, attempts]);
  
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <div className="w-8 h-8 border-4 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt || ""}
        className={`${className || ""} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        width={width}
        height={height}
        onError={handleError}
        {...props}
      />
    </>
  );
}