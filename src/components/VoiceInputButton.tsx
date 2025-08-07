import React, { useEffect, useRef } from "react"
import { Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useUser } from "@/hooks/useUser"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"
import { toast } from "sonner"

interface VoiceInputButtonProps {
  onTranscript: (transcript: string) => void
  onTranscriptChange?: (transcript: string) => void // Called on interim changes
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "outline" | "default"
  className?: string
  disabled?: boolean
  autoSubmit?: boolean // Whether to auto-submit when speech ends
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  onTranscriptChange,
  size = "md",
  variant = "ghost",
  className,
  disabled = false,
  autoSubmit = false,
}) => {
  const { data: user } = useUser()
  const {
    isSupported,
    isListening,
    finalTranscript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Track when user manually stops to prevent auto-submit
  const manuallyStoppedRef = useRef(false)

  // Track when isListening changes
  useEffect(() => {
    console.log("🎤 isListening state changed:", isListening)
  }, [isListening])

  // Get user's auto-submit preference
  const speechPrefs = user?.preferences?.speech
  const _enableAutoSubmit = speechPrefs?.enableAutoSubmit ?? false

  // Handle transcript changes - only when actively listening AND not manually stopped
  useEffect(() => {
    if (onTranscriptChange && isListening && !manuallyStoppedRef.current) {
      const fullTranscript = (finalTranscript + " " + interimTranscript).trim()
      if (fullTranscript) {
        onTranscriptChange(fullTranscript)
      }
    }
  }, [finalTranscript, interimTranscript, onTranscriptChange, isListening])

  // Handle final transcript submission - only if not manually stopped
  useEffect(() => {
    if (finalTranscript && autoSubmit && !manuallyStoppedRef.current) {
      onTranscript(finalTranscript)
      resetTranscript()
    }
  }, [finalTranscript, autoSubmit, onTranscript, resetTranscript])

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleClick = () => {
    console.log("🎤 Button clicked, isListening:", isListening)
    triggerHaptic(HapticPattern.Medium)

    if (isListening) {
      console.log("🎤 Stopping listening...")
      // Mark as manually stopped to prevent auto-submit
      manuallyStoppedRef.current = true
      stopListening()

      // When manually stopping, don't do anything with the transcript
      // The ongoing transcript updates through onTranscriptChange will handle text field population

      // Reset transcript immediately to prevent any lingering effects
      resetTranscript()
    } else {
      console.log("🎤 Starting listening...")
      // Reset the manual stop flag and transcript when starting fresh
      manuallyStoppedRef.current = false
      resetTranscript()
      startListening()
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Space + Shift for voice input
      if (event.code === "Space" && event.shiftKey && !disabled) {
        event.preventDefault()
        handleClick()
      }
      // Escape to cancel
      if (event.code === "Escape" && isListening) {
        event.preventDefault()
        stopListening()
        resetTranscript()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isListening, disabled, handleClick, stopListening, resetTranscript])

  // Don't render if not supported
  if (!isSupported) {
    return null
  }

  const getIcon = () => {
    if (isListening) {
      return <MicOff className="text-red-500" />
    } else {
      return <Mic />
    }
  }

  const getAriaLabel = () => {
    return isListening ? "Stop voice input" : "Start voice input"
  }

  const getTooltip = () => {
    if (isListening) {
      return "Stop listening (click or press Shift+Space)"
    } else {
      return "Start voice input (click or press Shift+Space)"
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
      type="button"
      variant={variant}
      size="icon"
      className={cn(
        sizeClasses[size],
        "transition-colors relative",
        isListening &&
          "animate-pulse bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      aria-label={getAriaLabel()}
      title={getTooltip()}
    >
      <div className={iconSizes[size]}>{getIcon()}</div>

      {/* Recording indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </Button>
  )
}

export default VoiceInputButton
