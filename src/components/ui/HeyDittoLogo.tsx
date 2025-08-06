import React from "react"
import { cn } from "@/lib/utils"

interface HeyDittoLogoProps {
  className?: string
  alt?: string
}

const HeyDittoLogo: React.FC<HeyDittoLogoProps> = ({ 
  className,
  alt = "Hey Ditto" 
}) => {
  return (
    <img
      src="/assets/hey-ditto-words/hey-ditto-words-128h.png"
      srcSet={`
        /assets/hey-ditto-words/hey-ditto-words-64h.png 64w,
        /assets/hey-ditto-words/hey-ditto-words-128h.png 128w,
        /assets/hey-ditto-words/hey-ditto-words-192h.png 192w,
        /assets/hey-ditto-words/hey-ditto-words-256h.png 256w,
        /assets/hey-ditto-words/hey-ditto-words-384h.png 384w,
        /assets/hey-ditto-words/hey-ditto-words-512h.png 512w
      `}
      sizes="(max-width: 640px) 128px, 192px"
      alt={alt}
      className={cn("object-contain select-none", className)}
      loading="eager"
    />
  )
}

export default HeyDittoLogo 