import React, { useCallback, useState } from "react"
import { MemorySlider } from "@/components/ui/sliders/MemorySlider"
import { MEMORY_CONFIG } from "@/constants"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useUser } from "@/hooks/useUser"
import { Zap, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import "./MemoryControlsModal.css"

const redirectToGeneralTab = () => {
  const generalTab = document.querySelector('.modal-tab[data-tab-id="general"]')
  if (generalTab) {
    ;(generalTab as HTMLElement).click()
  }
}

type MemoryControlsModalProps = {
  minimumTier?: number
}

const MemoryControlsModal: React.FC<MemoryControlsModalProps> = ({
  minimumTier = 1,
}) => {
  const { preferences, updatePreferences } = useModelPreferences()
  const { data: user } = useUser()

  const isLocked = (user?.planTier || 0) < minimumTier

  const handleShortTermChange = useCallback(
    (newValues: number[]) => {
      if (!preferences) return
      updatePreferences({
        memory: {
          ...preferences.memory,
          shortTermMemoryCount: newValues[0],
        },
      })
    },
    [preferences, updatePreferences]
  )

  const handleLongTermChange = useCallback(
    (newValues: number[]) => {
      if (!preferences) return
      // Always keep exactly 2 levels
      const finalValues = newValues.slice(0, 2)
      while (finalValues.length < 2) {
        finalValues.push(0)
      }
      updatePreferences({
        memory: {
          ...preferences.memory,
          longTermMemoryChain: finalValues,
        },
      })
    },
    [preferences, updatePreferences]
  )

  const [showShortTermInfo, setShowShortTermInfo] = useState(false)
  const [showLongTermInfo, setShowLongTermInfo] = useState(false)

  if (!preferences) return null

  return (
    <div className="memory-controls-content space-y-4">
      <div className="relative">
        <MemorySlider
          label="Short Term Memory"
          values={[preferences.memory.shortTermMemoryCount]}
          onChange={handleShortTermChange}
          min={MEMORY_CONFIG.shortTerm.min}
          max={MEMORY_CONFIG.shortTerm.max}
          step={MEMORY_CONFIG.shortTerm.step}
          marks={MEMORY_CONFIG.shortTerm.marks}
          onInfoClick={() => setShowShortTermInfo(true)}
          minimumTier={minimumTier}
        />
        {showShortTermInfo && (
          <div className="absolute top-0 left-0 right-0 bg-background border rounded-lg p-4 shadow-lg z-10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">Short Term Memory</h4>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => setShowShortTermInfo(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Controls how many of your recent conversation turns Ditto
              remembers. Higher values help Ditto maintain context over longer
              conversations. Each unit represents one complete exchange (your
              message + Ditto's response).
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <MemorySlider
          label="Long Term Memory"
          values={preferences.memory.longTermMemoryChain.slice(0, 2)}
          onChange={handleLongTermChange}
          min={MEMORY_CONFIG.longTerm.min}
          max={MEMORY_CONFIG.longTerm.max}
          step={MEMORY_CONFIG.longTerm.step}
          marks={MEMORY_CONFIG.longTerm.marks}
          onInfoClick={() => setShowLongTermInfo(true)}
          showLongTermLevels
          minimumTier={minimumTier}
        />
        {showLongTermInfo && (
          <div className="absolute top-0 left-0 right-0 bg-background border rounded-lg p-4 shadow-lg z-10">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">Long Term Memory</h4>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6"
                onClick={() => setShowLongTermInfo(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Retrieves relevant memories from your conversation history based
              on current topics. Level 1 searches your most relevant past
              conversations, while Level 2 searches deeper for additional
              context. Set either level to 0 to disable it.
            </p>
          </div>
        )}
      </div>

      {isLocked && (
        <div onClick={redirectToGeneralTab} className="upgrade-overlay">
          <Zap className="h-4 w-4" />
          <span>Upgrade to Spark to customize memory settings</span>
        </div>
      )}
    </div>
  )
}

export default MemoryControlsModal
