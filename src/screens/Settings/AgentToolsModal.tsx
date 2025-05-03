import { TOOLS } from "@/constants"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { ToolPreferences } from "@/types/llm"
import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import { Zap, Info } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import {
  triggerHaptic,
  HapticPattern,
  VibrationPatterns,
} from "@/utils/haptics"

const redirectToGeneralTab = () => {
  triggerHaptic(HapticPattern.Warning)
  const generalTab = document.querySelector('.modal-tab[data-tab-id="general"]')
  if (generalTab) {
    ;(generalTab as HTMLElement).click()
  }
}

type AgentToolsModalProps = {
  minimumTier?: number
}

export const AgentToolsModal: React.FC<AgentToolsModalProps> = ({
  minimumTier = 1,
}) => {
  const { preferences, updatePreferences } = useModelPreferences()
  const [localTools, setLocalTools] = useState<ToolPreferences | null>(null)
  const { data: user } = useUser()

  const isLocked = (user?.planTier || 0) < minimumTier

  useEffect(() => {
    if (preferences) {
      setLocalTools({ ...preferences.tools })
    }
  }, [preferences])

  const handleToolToggle = (toolName: keyof ToolPreferences) => {
    if (!localTools) return

    // Update local state immediately for UI responsiveness
    const updatedTools = {
      ...localTools,
      [toolName]: !localTools[toolName],
    }
    setLocalTools(updatedTools)

    // Trigger haptic feedback based on the new state
    if (updatedTools[toolName]) {
      triggerHaptic(VibrationPatterns.Success)
    } else {
      triggerHaptic(HapticPattern.Light)
    }

    // Then update the backend
    updatePreferences({
      tools: updatedTools,
    })
  }

  if (!preferences || !localTools) return null

  return (
    <div
      className={cn("p-6 overflow-y-auto relative", isLocked && "opacity-60")}
    >
      <div className="space-y-4">
        {TOOLS.map((tool) => (
          <div
            key={tool.id}
            className={cn(
              "bg-muted/30 border border-border rounded-xl p-4 transition-all duration-200",
              "hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-md",
              isLocked && "pointer-events-none"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-medium text-foreground">{tool.name}</h3>
                  <Info className="h-4 w-4 text-muted-foreground opacity-70" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={
                  localTools[tool.id as keyof ToolPreferences]
                    ? "enabled"
                    : "disabled"
                }
                onValueChange={(value) => {
                  if (value) {
                    // Only toggle if a button was actually pressed
                    handleToolToggle(tool.id as keyof ToolPreferences)
                  }
                }}
                disabled={isLocked}
              >
                <ToggleGroupItem value="enabled" aria-label="Enable tool">
                  Enabled
                </ToggleGroupItem>
                <ToggleGroupItem value="disabled" aria-label="Disable tool">
                  Disabled
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        ))}
      </div>

      {isLocked && (
        <div
          onClick={redirectToGeneralTab}
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/5 backdrop-blur-[1px]"
        >
          <div className="flex items-center gap-2 bg-background/80 py-2 px-4 rounded-md">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">
              Upgrade to Spark to enable agent tools
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default AgentToolsModal
