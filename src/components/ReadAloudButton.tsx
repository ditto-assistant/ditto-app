import React from "react"
import { Pause, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useReadAloud } from "@/hooks/useReadAloud"
import { ReadTarget } from "@/api/readAloud"

interface ReadAloudButtonProps {
  pairID: string
  target?: ReadTarget
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "outline" | "default"
  className?: string
}

const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  pairID,
  target = "response",
  size = "sm",
  variant = "ghost",
  className,
}) => {
  const {
    isSupported,
    isLoading,
    isPlaying,
    currentPairId,
    currentTarget,
    play,
    pause,
  } = useReadAloud()

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

  // Check if this button represents the currently playing audio
  const isThisAudioPlaying =
    currentPairId === pairID && currentTarget === target && isPlaying
  const isThisAudioLoaded = currentPairId === pairID && currentTarget === target

  const handleClick = async () => {
    if (isLoading) return
    if (isThisAudioPlaying) {
      pause()
    } else {
      await play(pairID, target)
    }
  }

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        "text-foreground/70 hover:bg-background/20 transition-colors",
        isThisAudioPlaying && "text-blue-600 dark:text-blue-400",
        isThisAudioLoaded &&
          !isThisAudioPlaying &&
          "text-blue-500/70 dark:text-blue-300/70",
        className
      )}
      onClick={handleClick}
      aria-label={isThisAudioPlaying ? "Pause read aloud" : "Play read aloud"}
      title={isThisAudioPlaying ? "Pause read aloud" : "Play read aloud"}
      disabled={isLoading}
    >
      <div className={iconSizes[size]}>
        {isLoading && isThisAudioLoaded ? (
          <Loader2 className="animate-spin" />
        ) : isThisAudioPlaying ? (
          <Pause />
        ) : (
          <Play />
        )}
      </div>
    </Button>
  )
}

export default ReadAloudButton
