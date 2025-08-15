import React from "react"
import { Volume2, VolumeX, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { useUser, useUserPreferences } from "@/hooks/useUser"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"

interface SpeakerToggleButtonProps {
  text?: string // Text to speak when clicked (if provided)
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "outline" | "default"
  showGlobalToggle?: boolean // Whether this is a global toggle or just a speak button
  className?: string
}

const SpeakerToggleButton: React.FC<SpeakerToggleButtonProps> = ({
  text,
  size = "sm",
  variant = "ghost",
  showGlobalToggle = false,
  className,
}) => {
  const { data: user } = useUser()
  const { mutate: updatePreferences, isPending: isUpdatingPreferences } =
    useUserPreferences()
  const { speak, stop, isPlaying, isSupported } = useSpeechSynthesis()

  const speechPrefs = user?.preferences?.speech
  const isReadbackEnabled = speechPrefs?.enableReadback ?? false

  const handleGlobalToggle = () => {
    triggerHaptic(HapticPattern.Light)

    updatePreferences({
      speech: {
        enableReadback: !isReadbackEnabled,
      },
    })
  }

  const handleSpeak = () => {
    triggerHaptic(HapticPattern.Light)

    if (isPlaying) {
      stop()
    } else if (text) {
      speak(text)
    }
  }

  const handleClick = () => {
    if (showGlobalToggle) {
      handleGlobalToggle()
    } else {
      handleSpeak()
    }
  }

  // Don't render if speech synthesis is not supported
  if (!isSupported) {
    return null
  }

  const isActive = showGlobalToggle ? isReadbackEnabled : isPlaying
  const isLoading = isUpdatingPreferences

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="animate-spin" />
    }

    if (showGlobalToggle) {
      return isReadbackEnabled ? <Volume2 /> : <VolumeX />
    } else {
      return isPlaying ? <VolumeX /> : <Volume2 />
    }
  }

  const getAriaLabel = () => {
    if (showGlobalToggle) {
      return isReadbackEnabled
        ? "Disable voice readback"
        : "Enable voice readback"
    } else {
      return isPlaying ? "Stop speaking" : "Read aloud"
    }
  }

  const getTooltip = () => {
    if (showGlobalToggle) {
      return isReadbackEnabled
        ? "Voice readback is ON - Click to disable"
        : "Voice readback is OFF - Click to enable"
    } else {
      return isPlaying ? "Stop reading" : "Read this message aloud"
    }
  }

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

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        "text-foreground/70 hover:bg-background/20 transition-colors",
        isActive && "text-blue-600 dark:text-blue-400",
        className
      )}
      onClick={handleClick}
      disabled={isLoading || (!text && !showGlobalToggle)}
      aria-label={getAriaLabel()}
      title={getTooltip()}
    >
      <div className={iconSizes[size]}>{getIcon()}</div>
    </Button>
  )
}

export default SpeakerToggleButton
