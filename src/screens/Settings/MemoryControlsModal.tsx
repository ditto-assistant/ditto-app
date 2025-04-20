import React, { useCallback } from "react"
import { MemorySlider } from "@/components/ui/sliders/MemorySlider"
import { MEMORY_CONFIG } from "@/constants"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useUser } from "@/hooks/useUser"
import { FaBolt } from "react-icons/fa"
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
      if (newValues.length <= MEMORY_CONFIG.longTerm.maxChainLength) {
        updatePreferences({
          memory: {
            ...preferences.memory,
            longTermMemoryChain: newValues,
          },
        })
      }
    },
    [preferences, updatePreferences]
  )

  if (!preferences) return null

  return (
    <div className={`memory-controls-content ${isLocked ? "locked" : ""}`}>
      <MemorySlider
        label="Short Term Memory"
        values={[preferences.memory.shortTermMemoryCount]}
        onChange={handleShortTermChange}
        min={MEMORY_CONFIG.shortTerm.min}
        max={MEMORY_CONFIG.shortTerm.max}
        step={MEMORY_CONFIG.shortTerm.step}
        marks={MEMORY_CONFIG.shortTerm.marks}
        description={`Number of recent messages to include in short-term memory (max ${MEMORY_CONFIG.shortTerm.max})`}
        minimumTier={minimumTier}
      />

      <MemorySlider
        label="Long Term Memory Chain"
        values={preferences.memory.longTermMemoryChain}
        onChange={handleLongTermChange}
        min={MEMORY_CONFIG.longTerm.min}
        max={MEMORY_CONFIG.longTerm.max}
        step={MEMORY_CONFIG.longTerm.step}
        marks={MEMORY_CONFIG.longTerm.marks}
        description={`Chain of memory depths for long-term memory search (max ${MEMORY_CONFIG.longTerm.maxChainLength} levels, max ${MEMORY_CONFIG.longTerm.max} memories per level)`}
        showChainControls
        maxChainLength={MEMORY_CONFIG.longTerm.maxChainLength}
        minimumTier={minimumTier}
      />

      {isLocked && (
        <div onClick={redirectToGeneralTab} className="upgrade-overlay">
          <FaBolt />
          <span>Upgrade to Spark to customize memory settings</span>
        </div>
      )}
    </div>
  )
}

export default MemoryControlsModal
