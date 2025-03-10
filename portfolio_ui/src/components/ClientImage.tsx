// portfolio_ui/src/components/ClientImage.tsx

"use client"

import Image, { ImageProps } from "next/image"
import { useState, useEffect } from "react"

interface ClientImageProps extends Partial<ImageProps> {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
}

export default function ClientImage({
  src,
  alt = "",
  fallbackSrc = "/fallback-image.jpg",
  ...props
}: ClientImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setHasError(false);
  }, [src, fallbackSrc]);

  if (!src) {
    return <img src={fallbackSrc} alt={alt} {...props} />;
  }

  if (hasError) {
    console.log("Using fallback for:", src);
    return <img src={fallbackSrc} alt={alt} {...props} />;
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => {
        console.error("Image load failed:", imgSrc);
        setHasError(true);
        setImgSrc(fallbackSrc);
      }}
      unoptimized
    />
  );
}