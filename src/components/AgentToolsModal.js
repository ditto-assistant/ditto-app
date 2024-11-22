import React from 'react';
import { MdClose } from 'react-icons/md';
import { DEFAULT_PREFERENCES } from '../constants';

function AgentToolsModal({ preferences, updatePreferences, onClose }) {
  const tools = preferences?.tools || DEFAULT_PREFERENCES.tools;

  const handleToolToggle = (toolName) => {
    updatePreferences({
      tools: {
        ...tools,
        [toolName]: !tools[toolName]
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Agent Tools</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="tool-toggles">
            <div className="tool-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={tools.htmlScript}
                  onChange={() => handleToolToggle('htmlScript')}
                />
                HTML Script Generator
              </label>
            </div>
            <div className="tool-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={tools.imageGeneration}
                  onChange={() => handleToolToggle('imageGeneration')}
                />
                Image Generation
              </label>
            </div>
            <div className="tool-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={tools.googleSearch}
                  onChange={() => handleToolToggle('googleSearch')}
                />
                Google Search
              </label>
            </div>
            <div className="tool-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={tools.openScad}
                  onChange={() => handleToolToggle('openScad')}
                />
                OpenSCAD
              </label>
            </div>
            <div className="tool-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={tools.googleHome}
                  onChange={() => handleToolToggle('googleHome')}
                />
                Home Assistant
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentToolsModal; 