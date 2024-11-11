import { useState, useEffect } from "react";
import {
  syncLocalScriptsWithFirestore,
  getScriptTimestamps,
} from "../control/firebase";

export const useScripts = () => {
  const [scripts, setScripts] = useState(() => ({
    webApps: JSON.parse(localStorage.getItem("webApps")) || [],
    openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || [],
  }));

  const [lastSyncTime, setLastSyncTime] = useState(null);
  const SYNC_INTERVAL = 30000; // 30 seconds

  const syncScripts = async (force = false) => {
    const userID = localStorage.getItem("userID");
    if (!userID) return;

    // Only sync if forced or enough time has passed since last sync
    if (!force && lastSyncTime && Date.now() - lastSyncTime < SYNC_INTERVAL) {
      return;
    }

    try {
      const [webApps, openSCAD] = await Promise.all([
        syncLocalScriptsWithFirestore(userID, "webApps"),
        syncLocalScriptsWithFirestore(userID, "openSCAD"),
      ]);

      setScripts({ webApps, openSCAD });
      setLastSyncTime(Date.now());
    } catch (error) {
      console.error("Error syncing scripts:", error);
    }
  };

  // Initial sync and timestamp fetch
  useEffect(() => {
    const userID = localStorage.getItem("userID");
    if (userID) {
      // Initial sync
      syncScripts(true);

      // Initial timestamp fetch
      const fetchTimestamps = async () => {
        await Promise.all([
          getScriptTimestamps(userID, "webApps"),
          getScriptTimestamps(userID, "openSCAD"),
        ]);
      };
      fetchTimestamps();
    }
  }, []);

  // Listen for script updates
  useEffect(() => {
    const handleScriptsUpdate = () => {
      syncScripts(true);
    };

    window.addEventListener("scriptsUpdated", handleScriptsUpdate);
    return () => {
      window.removeEventListener("scriptsUpdated", handleScriptsUpdate);
    };
  }, []);

  // Periodic sync
  useEffect(() => {
    const interval = setInterval(() => {
      syncScripts();
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [lastSyncTime]);

  return {
    scripts,
    syncScripts: () => syncScripts(true),
  };
};
