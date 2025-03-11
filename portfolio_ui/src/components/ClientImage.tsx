// portfolio_ui/src/components/ClientImage.tsx

"use client"

import Image, { type ImageProps } from "next/image"
import { useState, useEffect } from "react"
import { getMediaUrl } from "@/library/s3-config"

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
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);

  // Process the URL when the component mounts or src changes
  useEffect(() => {
    if (src) {
      const processedSrc = getMediaUrl(src);
      console.log("Processing image URL:", src, "->", processedSrc);
      setImgSrc(processedSrc);
      setHasError(false);
    } else {
      setImgSrc(fallbackSrc);
    }
  }, [src, fallbackSrc]);

  if (hasError || !imgSrc) {
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
      }}
      unoptimized
    />
  );
}