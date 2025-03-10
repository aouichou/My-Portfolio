// portfolio_ui/src/components/ClientImage.tsx

"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { getMediaUrl } from "@/library/api-client"

interface ClientImageProps extends Partial<ImageProps> {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  style?: React.CSSProperties;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function ClientImage({
  src, 
  alt = "",
  fallbackSrc = "/fallback-image.jpg",
  className = "", 
  style = {},
  fill,
  width,
  height,
  ...props
}: ClientImageProps) {
  const [error, setError] = useState(false);
  
  // Safety check - if src is undefined, use fallback directly
  if (!src) {
    return (
      <img
        src={fallbackSrc}
        alt={alt || "Fallback image"}
        className={className}
        style={{ objectFit: "cover", ...style }}
        width={width}
        height={height}
      />
    );
  }

  // Process the URL
  const finalSrc = typeof src === 'string' 
    ? getMediaUrl(src)
    : src;
    
  console.log('Loading image:', finalSrc);

  // If there's already been an error, use the fallback
  if (error) {
    return (
      <img
        src={fallbackSrc}
        alt={alt || "Fallback image"}
        className={className}
        style={{ objectFit: "cover", ...style }}
        width={width}
        height={height}
      />
    );
  }

  // Use the Next.js Image component with robust error handling
  return (
    <Image
      src={finalSrc}
      alt={alt}
      className={className}
      style={{ objectFit: "cover", ...style }}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      onError={(e) => {
        console.error('Image load failed:', finalSrc);
        setError(true);
      }}
      unoptimized={true}
      {...props}
    />
  );
}