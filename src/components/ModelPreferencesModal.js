import React from 'react';
import ModelDropdown from './ModelDropdown';
import ModelDropdownImage from './ModelDropdownImage';
import { IMAGE_GENERATION_MODELS } from '../constants';
import { MdClose } from 'react-icons/md';

function ModelPreferencesModal({ preferences, updatePreferences, onClose, hasEnoughBalance }) {
  const hasEnoughBalanceForPremium = hasEnoughBalance || false;

  const handleModalClick = (e) => {
    // Only close if clicking the actual overlay background element
    if (e.currentTarget === e.target) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  const handleModelChange = (key, value) => {
    updatePreferences({ [key]: value });
  };

  return (
    <div 
      className="modal-overlay" 
      onMouseDown={(e) => {
        // Prevent clicks from reaching underlying elements
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
          onClose();
        }
      }}
    >
      <div 
        className="modal-content" 
        style={{ maxHeight: '80vh' }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="modal-header">
          <h3>Model Preferences</h3>
          <MdClose 
            className="close-icon" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }} 
          />
        </div>
        <div 
          className="modal-body"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div 
            className="model-selector-container"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="model-selector">
              <label className="model-label">Main Agent Model</label>
              <ModelDropdown
                value={preferences.mainModel}
                onChange={(value) => handleModelChange('mainModel', value)}
                hasEnoughBalance={hasEnoughBalanceForPremium}
                inModal={true}
              />
            </div>
            <div className="model-selector">
              <label className="model-label">Programmer Model</label>
              <ModelDropdown
                value={preferences.programmerModel}
                onChange={(value) => handleModelChange('programmerModel', value)}
                hasEnoughBalance={hasEnoughBalanceForPremium}
                inModal={true}
              />
            </div>
            <div className="model-selector">
              <label className="model-label">Image Generation Model</label>
              <ModelDropdownImage
                value={preferences.imageGeneration}
                onChange={(model, size) => handleModelChange('imageGeneration', { model, size })}
                hasEnoughBalance={hasEnoughBalanceForPremium}
                inModal={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelPreferencesModal; 