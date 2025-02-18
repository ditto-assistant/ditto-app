import { MdClose } from "react-icons/md";
import { DEFAULT_PREFERENCES, TOOLS } from "../constants";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { ToolPreferences } from "@/types/llm";

type AgentToolsModalProps = {
  onClose: () => void;
};

export default function AgentToolsModal({ onClose }: AgentToolsModalProps) {
  const { preferences, updatePreferences } = useModelPreferences();
  const tools = preferences?.tools || DEFAULT_PREFERENCES.tools;

  const handleToolToggle = (toolName: keyof ToolPreferences) => {
    updatePreferences({
      tools: {
        ...tools,
        [toolName]: !tools[toolName],
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content tools-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Agent Tools</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="tool-toggles">
            <div className="tool-toggle">
              <label>
                <div className="tool-toggle-header">
                  <input
                    type="checkbox"
                    checked={tools.htmlScript}
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
                    checked={tools.imageGeneration}
                    onChange={() => handleToolToggle("imageGeneration")}
                  />
                  <span className="tool-name">
                    {TOOLS.imageGeneration.name}
                  </span>
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
                    checked={tools.googleSearch}
                    onChange={() => handleToolToggle("googleSearch")}
                  />
                  <span className="tool-name">{TOOLS.googleSearch.name}</span>
                </div>
                <p className="tool-description">
                  {TOOLS.googleSearch.description}
                </p>
              </label>
            </div>

            <div className="tool-toggle">
              <label>
                <div className="tool-toggle-header">
                  <input
                    type="checkbox"
                    checked={tools.openScad}
                    onChange={() => handleToolToggle("openScad")}
                  />
                  <span className="tool-name">{TOOLS.openScad.name}</span>
                </div>
                <p className="tool-description">{TOOLS.openScad.description}</p>
              </label>
            </div>

            <div className="tool-toggle">
              <label>
                <div className="tool-toggle-header">
                  <input
                    type="checkbox"
                    checked={tools.googleHome}
                    onChange={() => handleToolToggle("googleHome")}
                  />
                  <span className="tool-name">{TOOLS.googleHome.name}</span>
                </div>
                <p className="tool-description">
                  {TOOLS.googleHome.description}
                </p>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
