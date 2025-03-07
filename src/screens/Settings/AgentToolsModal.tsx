import { TOOLS } from "@/constants";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { ToolPreferences } from "@/types/llm";
import { useState, useEffect } from "react";
import "./AgentToolsModal.css";

export default function AgentToolsModal() {
  const { preferences, updatePreferences } = useModelPreferences();
  const [localTools, setLocalTools] = useState<ToolPreferences | null>(null);

  useEffect(() => {
    if (preferences) {
      setLocalTools({ ...preferences.tools });
    }
  }, [preferences]);

  const handleToolToggle = (toolName: keyof ToolPreferences) => {
    if (!localTools) return;

    // Update local state immediately for UI responsiveness
    const updatedTools = {
      ...localTools,
      [toolName]: !localTools[toolName],
    };
    setLocalTools(updatedTools);

    // Then update the backend
    updatePreferences({
      tools: updatedTools,
    });
  };

  if (!preferences || !localTools) return null;

  return (
    <div className="agent-tools-content">
      <div className="tool-toggles">
        <div className="tool-toggle">
          <label>
            <div className="tool-toggle-header">
              <input
                type="checkbox"
                checked={localTools.htmlScript}
                onChange={() => handleToolToggle("htmlScript")}
              />
              <span className="tool-name">{TOOLS.webApps.name}</span>
            </div>
            <p className="tool-description">{TOOLS.webApps.description}</p>
          </label>
        </div>

        <div className="tool-toggle">
          <label>
            <div className="tool-toggle-header">
              <input
                type="checkbox"
                checked={localTools.imageGeneration}
                onChange={() => handleToolToggle("imageGeneration")}
              />
              <span className="tool-name">{TOOLS.imageGeneration.name}</span>
            </div>
            <p className="tool-description">
              {TOOLS.imageGeneration.description}
            </p>
          </label>
        </div>

        <div className="tool-toggle">
          <label>
            <div className="tool-toggle-header">
              <input
                type="checkbox"
                checked={localTools.googleSearch}
                onChange={() => handleToolToggle("googleSearch")}
              />
              <span className="tool-name">{TOOLS.googleSearch.name}</span>
            </div>
            <p className="tool-description">{TOOLS.googleSearch.description}</p>
          </label>
        </div>

        <div className="tool-toggle">
          <label>
            <div className="tool-toggle-header">
              <input
                type="checkbox"
                checked={localTools.openScad}
                onChange={() => handleToolToggle("openScad")}
              />
              <span className="tool-name">{TOOLS.openScad.name}</span>
            </div>
            <p className="tool-description">{TOOLS.openScad.description}</p>
          </label>
        </div>
      </div>
    </div>
  );
}
