import { useEffect, useState } from 'react';
import Modal from '@/components/ui/modals/Modal';
import { getUpdateState } from '@/utils/updateService';
import { version as appVersion } from '../../../package.json';
import './WhatsNew.css';

// Import all version components
import V0_11_54 from './versions/V0_11_54';
// Add imports for future versions here

// Map versions to their components
const versionComponents: Record<string, React.ComponentType> = {
  '0.11.54': V0_11_54,
  // Add future versions here
};

// Helper to convert version string to component name
export const getVersionComponentKey = (version: string): string => {
  return version.replace(/\./g, '_');
};

// Helper to convert component name to version string
export const getVersionFromComponentKey = (key: string): string => {
  return key.replace(/_/g, '.');
};

interface WhatsNewProps {
  isOpen: boolean;
  onClose: () => void;
  forceVersion?: string; // Optional prop to force showing a specific version
}

const WhatsNew = ({ isOpen, onClose, forceVersion }: WhatsNewProps) => {
  const [dismissedVersions, setDismissedVersions] = useState<string[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  
  useEffect(() => {
    // Load dismissed versions from localStorage
    const savedDismissed = localStorage.getItem('whats-new-dismissed');
    if (savedDismissed) {
      setDismissedVersions(JSON.parse(savedDismissed));
    }
    
    // If a forced version is provided, use it
    if (forceVersion) {
      setCurrentVersion(forceVersion);
      return;
    }
    
    // Check if user just updated and show the latest version changes
    const updateState = getUpdateState();
    if (updateState.justUpdated) {
      // Use current app version as the version to show
      setCurrentVersion(appVersion);
    }
  }, [forceVersion]);
  
  // Handle closing the modal
  const handleClose = () => {
    // Add current version to dismissed list
    if (currentVersion) {
      const newDismissed = [...dismissedVersions, currentVersion];
      setDismissedVersions(newDismissed);
      localStorage.setItem('whats-new-dismissed', JSON.stringify(newDismissed));
    }
    onClose();
  };
  
  // If no version to show or it was already dismissed, don't render
  if (!currentVersion || 
      (!forceVersion && dismissedVersions.includes(currentVersion))) {
    return null;
  }
  
  // Find the component for the current version
  const VersionComponent = versionComponents[currentVersion];
  
  // If no component exists for this version, don't show anything
  if (!VersionComponent) {
    return null;
  }
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="whats-new-modal">
      <div className="whats-new-container">
        <div className="whats-new-header">
          <h2>What&apos;s New in v{currentVersion}</h2>
          <button className="whats-new-close" onClick={handleClose}>×</button>
        </div>
        <div className="whats-new-content">
          <VersionComponent />
        </div>
        <div className="whats-new-footer">
          <button className="whats-new-button" onClick={handleClose}>
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WhatsNew;