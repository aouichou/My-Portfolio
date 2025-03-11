// portfolio_ui/src/components/ClientImage.tsx

// "use client"

// import Image, { type ImageProps } from "next/image"
// import { useState, useEffect } from "react"
// import { getMediaUrl } from "@/library/s3-config"

// interface ClientImageProps extends Partial<ImageProps> {
//   src?: string;
//   alt?: string;
//   fallbackSrc?: string;
// }

// export default function ClientImage({
//   src,
//   alt = "",
//   fallbackSrc = "/fallback-image.jpg",
//   ...props
// }: ClientImageProps) {
//   const [imgSrc, setImgSrc] = useState<string | undefined>(src);
//   const [hasError, setHasError] = useState(false);

//   // Process the URL when the component mounts or src changes
//   useEffect(() => {
//     if (src) {
//       const processedSrc = getMediaUrl(src);
//       console.log("Processing image URL:", src, "->", processedSrc);
//       setImgSrc(processedSrc);
//       setHasError(false);
//     } else {
//       setImgSrc(fallbackSrc);
//     }
//   }, [src, fallbackSrc]);

//   if (hasError || !imgSrc) {
//     console.log("Using fallback for:", src);
//     return <img src={fallbackSrc} alt={alt} {...props} />;
//   }

//   return (
//     <Image
//       {...props}
//       src={imgSrc}
//       alt={alt}
//       onError={() => {
//         console.error("Image load failed:", imgSrc);
//         setHasError(true);
//       }}
//       unoptimized
//     />
//   );
// }

"use client"

import { useState, useEffect } from "react"

interface ClientImageProps {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export default function ClientImage({
  src,
  alt = "",
  fallbackSrc = "/fallback-image.jpg",
  className,
  width,
  height,
  ...props
}: ClientImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(fallbackSrc);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Reset when src changes
    setIsLoaded(false);
    
    if (!src) {
      setImgSrc(fallbackSrc);
      return;
    }
    
    // Try to load the image
    const img = new Image();
    img.src = src;
    
    const timer = setTimeout(() => {
      // After 3 seconds, assume loading failed
      if (!isLoaded) {
        console.log(`Image timeout: ${src}`);
        setImgSrc(fallbackSrc);
      }
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timer);
      setImgSrc(src);
      setIsLoaded(true);
    };
    
    img.onerror = () => {
      clearTimeout(timer);
      console.log(`Image failed to load: ${src}`);
      setImgSrc(fallbackSrc);
    };
    
    return () => clearTimeout(timer);
  }, [src, fallbackSrc, isLoaded]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      width={width}
      height={height}
      {...props}
    />
  );
}