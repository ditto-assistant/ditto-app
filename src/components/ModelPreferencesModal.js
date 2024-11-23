import React, { useState, useEffect } from 'react';
import ModelDropdown from './ModelDropdown';
import ModelDropdownImage from './ModelDropdownImage';
import { IMAGE_GENERATION_MODELS } from '../constants';
import { MdClose } from 'react-icons/md';

function ModelPreferencesModal({ preferences, updatePreferences, onClose, hasEnoughBalance }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Handle clicking outside of any dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Don't handle clicks inside dropdowns, their options, or the selectors
      if (e.target.closest('.model-dropdown') || 
          e.target.closest('.dropdown-option') ||
          e.target.closest('.model-selector') ||
          e.target.closest('.selected-value')) {
        return;
      }
      
      // Close dropdown if clicking outside
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModalClick = (e) => {
    // Only close modal if clicking the overlay background
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleModelChange = (key, value) => {
    updatePreferences({ [key]: value });
    setOpenDropdown(null);
  };

  return (
    <div className="modal-overlay" onClick={handleModalClick}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Model Preferences</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="model-selector-container">
            <div className="model-selector">
              <label className="model-label">Main Agent Model</label>
              <ModelDropdown
                value={preferences.mainModel}
                onChange={(value) => handleModelChange('mainModel', value)}
                hasEnoughBalance={hasEnoughBalance}
                isOpen={openDropdown === 'main'}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setOpenDropdown('main');
                  } else if (openDropdown === 'main') {
                    setOpenDropdown(null);
                  }
                }}
              />
            </div>
            <div className="model-selector">
              <label className="model-label">Programmer Model</label>
              <ModelDropdown
                value={preferences.programmerModel}
                onChange={(value) => handleModelChange('programmerModel', value)}
                hasEnoughBalance={hasEnoughBalance}
                isOpen={openDropdown === 'programmer'}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setOpenDropdown('programmer');
                  } else if (openDropdown === 'programmer') {
                    setOpenDropdown(null);
                  }
                }}
              />
            </div>
            <div className="model-selector">
              <label className="model-label">Image Generation Model</label>
              <ModelDropdownImage
                value={preferences.imageGeneration}
                onChange={(model, size) => handleModelChange('imageGeneration', { model, size })}
                hasEnoughBalance={hasEnoughBalance}
                isOpen={openDropdown === 'image'}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setOpenDropdown('image');
                  } else if (openDropdown === 'image') {
                    setOpenDropdown(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelPreferencesModal; 