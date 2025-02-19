// portfolio_ui/src/components/ClientImage.tsx
"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

export default function ClientImage(props: ImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <img
        src="/fallback-image.jpg"
        alt={props.alt || "fallback image"}
        className={props.className}
      />
    );
  }

  return (
    <Image
      {...props}
      onError={(e) => {
        console.error(`Failed to load image: ${props.src}`);
        setError(true);
      }}
    />
  );
}