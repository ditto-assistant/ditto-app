import { TOOLS } from "@/constants"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { ToolPreferences } from "@/types/llm"
import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import { FaBolt } from "react-icons/fa"
import "./AgentToolsModal.css"
import "@/components/ui/modals/Modal.css"

const redirectToGeneralTab = () => {
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

    // Then update the backend
    updatePreferences({
      tools: updatedTools,
    })
  }

  if (!preferences || !localTools) return null

  return (
    <div className={`agent-tools-content ${isLocked ? "locked" : ""}`}>
      <div className="tool-toggles">
        {TOOLS.map((tool) => (
          <div className="tool-toggle" key={tool.id}>
            <label>
              <div className="tool-toggle-header">
                <input
                  type="checkbox"
                  checked={localTools[tool.id as keyof ToolPreferences]}
                  onChange={() =>
                    handleToolToggle(tool.id as keyof ToolPreferences)
                  }
                  disabled={isLocked}
                />
                <span className="tool-name">{tool.name}</span>
              </div>
              <p className="tool-description">{tool.description}</p>
            </label>
          </div>
        ))}
      </div>

      {isLocked && (
        <div onClick={redirectToGeneralTab} className="upgrade-overlay">
          <FaBolt />
          <span>Upgrade to Spark to enable agent tools</span>
        </div>
      )}
    </div>
  )
}

export default AgentToolsModal
