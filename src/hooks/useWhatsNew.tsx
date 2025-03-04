import { useState, useEffect } from 'react';
import { getUpdateState } from '@/utils/updateService';

interface UseWhatsNewReturn {
  isWhatsNewOpen: boolean;
  openWhatsNew: (version?: string) => void;
  closeWhatsNew: () => void;
  currentVersion: string | null;
}

/**
 * Hook to manage What's New dialog visibility
 * 
 * Features:
 * - Automatically shows What's New when app is updated
 * - Can manually trigger showing What's New for any version
 * - Only shows What's New once per version
 */
const useWhatsNew = (): UseWhatsNewReturn => {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if user just updated to determine if we should show What's New
    const updateState = getUpdateState();
    
    if (updateState.justUpdated) {
      // Wait a moment before showing the What's New dialog to avoid
      // showing it immediately on app startup
      const timer = setTimeout(() => {
        setCurrentVersion(updateState.currentVersion);
        setIsWhatsNewOpen(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  const openWhatsNew = (version?: string) => {
    if (version) {
      setCurrentVersion(version);
    } else {
      setCurrentVersion(getUpdateState().currentVersion);
    }
    setIsWhatsNewOpen(true);
  };
  
  const closeWhatsNew = () => {
    setIsWhatsNewOpen(false);
  };
  
  return {
    isWhatsNewOpen,
    openWhatsNew,
    closeWhatsNew,
    currentVersion
  };
};

export default useWhatsNew;