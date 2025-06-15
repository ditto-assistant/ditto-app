import React, { useState, useEffect } from "react"
import { Brain, Sparkles, Zap, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SyncIndicatorProps {
  isVisible: boolean
  currentStage: number
  onComplete?: () => void
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  isVisible,
  currentStage,
  onComplete,
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  const phases = [
    {
      icon: Brain,
      text: "Organizing your thoughts...",
      color: "text-blue-500",
    },
    { icon: Sparkles, text: "Making connections...", color: "text-purple-500" },
    { icon: Zap, text: "Updating knowledge graph...", color: "text-green-500" },
    { icon: CheckCircle, text: "Finalizing sync...", color: "text-amber-500" },
  ]

  // Map stage number to phase index (stage 1-4 → phase 0-3)
  const currentPhase = Math.max(
    0,
    Math.min(currentStage - 1, phases.length - 1)
  )

  useEffect(() => {
    if (!isVisible) {
      setIsAnimating(false)
      return
    }
    setIsAnimating(true)
  }, [isVisible, currentStage, phases, currentPhase])

  if (!isVisible) {
    return null
  }
  const CurrentIcon = phases[currentPhase].icon

  return (
    <div
      className="mx-4 my-3 animate-in slide-in-from-bottom-2 duration-300"
      style={{
        // Position at bottom of chat, above SendMessage
        zIndex: 1000,
      }}
    >
      <div className="flex items-center justify-center p-3 rounded-lg bg-background/95 border border-border shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CurrentIcon
              className={cn(
                "w-5 h-5 transition-all duration-500 drop-shadow-sm",
                phases[currentPhase].color
              )}
            />
            <div className="absolute inset-0 animate-ping">
              <CurrentIcon
                className={cn("w-5 h-5 opacity-30", phases[currentPhase].color)}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-foreground transition-all duration-300">
            {phases[currentPhase].text}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((stage) => (
              <div
                key={stage}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  stage <= currentStage
                    ? "bg-primary shadow-sm"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SyncIndicator
