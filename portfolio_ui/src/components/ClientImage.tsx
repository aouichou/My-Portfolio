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
  // Initialize with the actual src to avoid hydration mismatch
  const [imgSrc, setImgSrc] = useState<string>(src || '/fallback-image.jpg');

  // Handle image loading errors
  const handleError = () => {
    if (imgSrc !== '/fallback-image.jpg') {
      console.log(`Falling back to default for: ${src}`);
      setImgSrc('/fallback-image.jpg');
    }
  };

  // Only try to load real image after hydration is complete
  useEffect(() => {
    // If src changes or is undefined, update imgSrc
    if (!src) {
      setImgSrc('/fallback-image.jpg');
      return;
    }

    // Preload image
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      if (imgSrc !== src) {
        setImgSrc(src);
      }
    };
    
    img.onerror = handleError;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, imgSrc]);
  
  return (
    <img
      src={imgSrc}
      alt={alt || ""}
      className={className || ""}
      width={width}
      height={height}
      onError={handleError}
      {...props}
    />
  );
}