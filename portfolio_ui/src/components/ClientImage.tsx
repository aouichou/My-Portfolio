// portfolio_ui/src/components/ClientImage.tsx

"use client";

import { useEffect, useState } from 'react';

type ClientImageProps = {
  src?: string;
  alt?: string;
  [key: string]: any;
};

export default function ClientImage({ src, alt, ...props }: ClientImageProps) {
  const [imgSrc, setImgSrc] = useState('/fallback-image.jpg');

  useEffect(() => {
    if (!src) return;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`/api/image-proxy?url=${encodeURIComponent(src)}`, { 
      signal: controller.signal 
    })
      .then(res => res.blob())
      .then(blob => setImgSrc(URL.createObjectURL(blob)))
      .catch(() => setImgSrc('/fallback-image.jpg'));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [src]);

  return <img src={imgSrc} alt={alt} {...props} />;
}