import React from "react"
import { Pause, Play, Loader2, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useReadAloud } from "@/hooks/useReadAloud"

interface ReadAloudButtonProps {
  pairID: string
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "outline" | "default"
  className?: string
}

const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  pairID,
  size = "sm",
  variant = "ghost",
  className,
}) => {
  const { isSupported, isLoading, isPlaying, play, pause, resume } =
    useReadAloud()

  if (!isSupported) return null

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  }
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  const handleClick = async () => {
    if (isLoading) return
    if (isPlaying) {
      pause()
    } else {
      await play(pairID)
    }
  }

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        "text-foreground/70 hover:bg-background/20 transition-colors",
        isPlaying && "text-blue-600 dark:text-blue-400",
        className
      )}
      onClick={handleClick}
      aria-label={isPlaying ? "Pause read aloud" : "Play read aloud"}
      title={isPlaying ? "Pause read aloud" : "Play read aloud"}
      disabled={isLoading}
    >
      <div className={iconSizes[size]}>
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : isPlaying ? (
          <Pause />
        ) : (
          // Use Volume2 as default play icon per design tone
          <Play />
        )}
      </div>
    </Button>
  )
}

export default ReadAloudButton
