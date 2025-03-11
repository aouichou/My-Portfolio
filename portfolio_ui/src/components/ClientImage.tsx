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

// import Image from "next/image"
import { useState, useEffect } from "react"

interface ClientImageProps {
  src?: string;
  alt?: string;
  fallbackSrc?: string;
  [key: string]: any; // For other props
}

export default function ClientImage({
  src,
  alt = "",
  fallbackSrc = "/fallback-image.jpg",
  ...props
}: ClientImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(fallbackSrc);
  const [hasError, setHasError] = useState(false);

  // Simple approach - use local fallback images
  useEffect(() => {
    if (!src) {
      setImgSrc(fallbackSrc);
      return;
    }
    
    // Try loading the image directly first
    const img = new window.Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setHasError(false);
    };
    
    img.onerror = () => {
      console.log(`Image failed to load: ${src}, using fallback`);
      setImgSrc(fallbackSrc);
      setHasError(true);
    };
  }, [src, fallbackSrc]);

  // Simply render an img element with error handling
  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
}