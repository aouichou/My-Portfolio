// portfolio_ui/src/components/ClientImage.tsx
"use client"

import Image, { type ImageProps } from "next/image"
import { useState } from "react"
import { getMediaUrl } from "@/library/api-client"

export default function ClientImage(props: ImageProps) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <img
        src="/fallback-image.jpg"
        alt={props.alt || "fallback image"}
        className={props.className}
        style={{ objectFit: "cover", ...props.style }}
      />
    )
  }

  const src = typeof props.src === "string" ? getMediaUrl(props.src) : props.src

  return (
    <Image
      {...props}
      src={src || "/placeholder.svg"}
      onError={(e) => {
        console.error(`Failed to load image: ${src}`)
        setError(true)
      }}
    />
  )
}

