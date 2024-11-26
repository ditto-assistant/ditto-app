import { useState, useEffect } from 'react';
import { syncLocalScriptsWithFirestore } from '../control/firebase';

export const useScripts = () => {
  const [scripts, setScripts] = useState({
    webApps: JSON.parse(localStorage.getItem("webApps")) || [],
    openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || [],
  });

  const refreshScripts = async () => {
    const userID = localStorage.getItem("userID");
    if (userID) {
      await syncLocalScriptsWithFirestore(userID, "webApps");
      await syncLocalScriptsWithFirestore(userID, "openSCAD");
      
      setScripts({
        webApps: JSON.parse(localStorage.getItem("webApps")) || [],
        openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || [],
      });
    }
  };

  // Listen for scriptsUpdated events
  useEffect(() => {
    const handleScriptsUpdate = () => {
      setScripts({
        webApps: JSON.parse(localStorage.getItem("webApps")) || [],
        openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || [],
      });
    };

    window.addEventListener("scriptsUpdated", handleScriptsUpdate);
    return () => {
      window.removeEventListener("scriptsUpdated", handleScriptsUpdate);
    };
  }, []);

  return { scripts, setScripts, refreshScripts };
};
