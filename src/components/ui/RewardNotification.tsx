import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface RewardNotificationProps {
  message: string
  onComplete?: () => void
  duration?: number
}

const RewardNotification: React.FC<RewardNotificationProps> = ({
  message,
  onComplete,
  duration = 2000,
}) => {
  const [animationPhase, setAnimationPhase] = useState<
    "initial" | "display" | "sucked"
  >("initial")

  useEffect(() => {
    // Phase 1: Start from bottom of top bar
    setTimeout(() => setAnimationPhase("display"), 50)

    // Phase 2: Show for a bit, then get sucked into Ditto icon
    const displayTimer = setTimeout(() => {
      setAnimationPhase("sucked")
    }, duration * 0.7) // Show for 70% of duration

    // Phase 3: Complete animation and cleanup
    const completeTimer = setTimeout(() => {
      onComplete?.()
    }, duration)

    return () => {
      clearTimeout(displayTimer)
      clearTimeout(completeTimer)
    }
  }, [duration, onComplete])

  const getAnimationStyles = () => {
    switch (animationPhase) {
      case "initial":
        return {
          transform: "translateX(-50%) translateY(40px) scale(0.8)",
          opacity: 0,
        }
      case "display":
        return {
          transform: "translateX(-50%) translateY(0px) scale(1)",
          opacity: 1,
        }
      case "sucked":
        return {
          transform: "translateX(-50%) translateY(-40px) scale(0.2)",
          opacity: 0,
        }
      default:
        return {}
    }
  }

  return createPortal(
    <div
      className="fixed z-50 pointer-events-none left-1/2 top-20"
      style={{
        ...getAnimationStyles(),
        transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div
        className={cn(
          "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
          "px-4 py-2 rounded-full font-semibold text-sm shadow-lg",
          "border border-green-400/50 backdrop-blur-sm",
          "flex items-center gap-2",
          animationPhase === "sucked" && "animate-pulse"
        )}
      >
        <span className="text-lg">💰</span>
        {message}
      </div>

      {/* Particle effect when getting sucked */}
      {animationPhase === "sucked" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          <div className="w-1 h-1 bg-green-400 rounded-full animate-ping delay-100 absolute" />
          <div className="w-1 h-1 bg-blue-400 rounded-full animate-ping delay-200 absolute" />
        </div>
      )}
    </div>,
    document.body
  )
}

export default RewardNotification
