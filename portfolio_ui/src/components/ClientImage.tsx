// portfolio_ui/src/components/ClientImage.tsx

"use client";

import { useState, useEffect } from 'react';

type ClientImageProps = {
  src?: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  [key: string]: any;
};

export default function ClientImage({ 
  src, 
  alt = "", 
  className, 
  width, 
  height,
  ...props 
}: ClientImageProps) {
  // Start with a loading state or fallback
  const [imgSrc, setImgSrc] = useState<string>('/fallback-image.jpg');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Use effect to ensure hydration consistency
  useEffect(() => {
    if (!src) return;
    
    // Now that we know we're on client side, try the real image
    const img = new Image();
    img.src = src;
    
    const timer = setTimeout(() => {
      if (!isLoaded) {
        console.log(`Image load timeout: ${src}`);
        setImgSrc('/fallback-image.jpg');
      }
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timer);
      setImgSrc(src);
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      console.error(`Image failed to load: ${src}`);
      setImgSrc('/fallback-image.jpg');
    };
    
    return () => clearTimeout(timer);
  }, [src, isLoaded]);
  
  // Simple img element with error handling
  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      onError={() => {
        console.log(`Error loading image: ${imgSrc}`);
        setImgSrc('/fallback-image.jpg');
      }}
      {...props}
    />
  );
}