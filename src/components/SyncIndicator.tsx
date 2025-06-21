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
      text: "Encoding memory patterns...",
      color: "text-blue-500",
    },
    {
      icon: Sparkles,
      text: "Adding to hippocampus...",
      color: "text-purple-500",
    },
    { icon: Zap, text: "Making connections...", color: "text-green-500" },
    { icon: CheckCircle, text: "Finalizing...", color: "text-amber-500" },
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
      className="animate-in slide-in-from-bottom-2 duration-300"
      style={{
        zIndex: 1000,
      }}
    >
      <div className="flex items-center justify-center p-2 rounded-md bg-background/90 border border-border/50 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <CurrentIcon
              className={cn(
                "w-4 h-4 transition-all duration-500 drop-shadow-sm",
                phases[currentPhase].color
              )}
            />
            <div className="absolute inset-0 animate-ping">
              <CurrentIcon
                className={cn("w-4 h-4 opacity-20", phases[currentPhase].color)}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-foreground/80 transition-all duration-300">
            {phases[currentPhase].text}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((stage) => (
              <div
                key={stage}
                className={cn(
                  "w-1 h-1 rounded-full transition-all duration-300",
                  stage <= currentStage
                    ? "bg-primary/80 shadow-sm"
                    : "bg-muted-foreground/20"
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
