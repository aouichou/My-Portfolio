// portfolio_ui/src/components/ClientImage.tsx

"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { getMediaUrl } from "@/library/api-client"

interface ClientImageProps extends ImageProps {
  fallbackSrc?: string;
}

export default function ClientImage(props: ClientImageProps) {
  const { fallbackSrc = "/fallback-image.jpg", ...imageProps } = props;
  const [error, setError] = useState(false);
  
  // First, determine the source URL with proper media URL handling
  const finalSrc = typeof props.src === 'string' 
    ? getMediaUrl(props.src)
    : props.src;
    
  console.log('Loading image:', finalSrc);

  // If there's an error, use the fallback
  if (error) {
    return (
      <img
        src={fallbackSrc}
        alt={props.alt || "fallback image"}
        className={props.className}
        style={{ objectFit: "cover", ...props.style }}
      />
    );
  }

  // Otherwise use the Next.js Image component with error handling
  return (
    <Image
      {...imageProps}
      src={finalSrc || '/placeholder.svg'}
      alt={props.alt || ''}
      onError={(e) => {
        console.error('Image load failed:', finalSrc);
        setError(true);
      }}
      unoptimized={props.unoptimized || true} // Use unoptimized for external URLs
    />
  );
}