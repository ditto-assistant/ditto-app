import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatusIcons from "./StatusIcons";
import { syncLocalScriptsWithFirestore } from "../control/firebase";
import { useBalance } from "../hooks/useBalance";
import { LoadingSpinner } from "./LoadingSpinner";
import { useMemoryCount } from "../hooks/useMemoryCount";
import { toast } from "react-hot-toast";
import CardMenu from "./CardMenu";

export default function StatusBar({ onMemoryClick, onScriptsClick }) {
  const navigate = useNavigate();
  const balance = useBalance();
  const memoryCount = useMemoryCount();
  const [workingScript, setWorkingScript] = useState(() => {
    const storedScript = localStorage.getItem("workingOnScript");
    return storedScript ? JSON.parse(storedScript).script : null;
  });
  const [showUSD, setShowUSD] = useState(() => {
    let savedMode = localStorage.getItem("status_bar_fiat_balance");
    if (savedMode == null) {
      savedMode = "m";
      localStorage.setItem("status_bar_fiat_balance", savedMode);
    }
    return savedMode === "t";
  });
  const [showMemories, setShowMemories] = useState(() => {
    let savedMode = localStorage.getItem("status_bar_fiat_balance");
    return savedMode === "m";
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [scripts, setScripts] = useState(() => {
    let webApps = JSON.parse(localStorage.getItem("webApps") ?? "[]");
    let openSCAD = JSON.parse(localStorage.getItem("openSCAD") ?? "[]");
    webApps.sort((a, b) => a.name.localeCompare(b.name));
    openSCAD.sort((a, b) => a.name.localeCompare(b.name));
    return { webApps, openSCAD };
  });

  const checkOnlineStatus = () => {
    setIsOnline(navigator.onLine);
  };

  const handleBookmarkClick = () => {
    if (onScriptsClick) {
      onScriptsClick();
    }
  };

  const handleMemoryClick = () => {
    onMemoryClick();
  };

  const syncLocalScripts = async () => {
    let userID = localStorage.getItem("userID");
    await syncLocalScriptsWithFirestore(userID, "webApps");
    await syncLocalScriptsWithFirestore(userID, "openScad");
    let webApps = JSON.parse(localStorage.getItem("webApps") ?? "[]");
    let openSCAD = JSON.parse(localStorage.getItem("openSCAD") ?? "[]");
    webApps.sort((a, b) => a.name.localeCompare(b.name));
    openSCAD.sort((a, b) => a.name.localeCompare(b.name));
    setScripts({ webApps, openSCAD });
  };

  // Update working script when localStorage changes
  useEffect(() => {
    syncLocalScripts();
    const handleStorageChange = (e) => {
      if (e.key === "workingOnScript") {
        const newScript = e.newValue ? JSON.parse(e.newValue).script : null;
        syncLocalScripts().then(() => {
          setWorkingScript(newScript);
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let webApps = scripts.webApps;
    let openSCAD = scripts.openSCAD;
    localStorage.setItem("webApps", JSON.stringify(webApps));
    localStorage.setItem("openSCAD", JSON.stringify(openSCAD));
  }, [scripts]);

  const toggleBalanceDisplay = () => {
    if (showMemories) {
      setShowMemories(false);
      setShowUSD(false);
      localStorage.setItem("status_bar_fiat_balance", "f");
    } else if (showUSD) {
      setShowMemories(true);
      setShowUSD(false);
      localStorage.setItem("status_bar_fiat_balance", "m");
    } else {
      setShowUSD(true);
      setShowMemories(false);
      localStorage.setItem("status_bar_fiat_balance", "t");
    }
  };

  useEffect(() => {
    if (balance.data?.dropAmount) {
      toast.success(`${balance.data.dropAmount} dropped!`);
    }
  }, [balance.data?.dropAmount]);

  return (
    <div style={styles.statusBar}>
      <div style={styles.status}>
        <div
          style={{
            ...styles.statusIndicator,
            backgroundColor: isOnline ? "green" : "red",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            marginRight: "6px",
          }}
        ></div>
        <p style={styles.statusText}>{isOnline ? "Online" : "Offline"}</p>
      </div>

      <StatusIcons
        handleBookmarkClick={handleBookmarkClick}
        handleMemoryClick={handleMemoryClick}
      />

      <div style={styles.balanceContainer} onClick={toggleBalanceDisplay}>
        <p style={styles.balanceIndicator}>
          {balance.isLoading ? (
            <LoadingSpinner size={14} inline={true} />
          ) : showMemories ? (
            `${memoryCount.count} Memories`
          ) : showUSD ? (
            balance.data?.usd
          ) : (
            balance.data?.balance
          )}
        </p>
      </div>
    </div>
  );
}

const styles = {
  statusBar: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 12px",
    background: "rgba(32, 34, 37, 0.6)",
    borderRadius: "12px",
    margin: "3px 8px",
    position: "relative",
    zIndex: 100,
  },
  status: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.9em",
    cursor: "pointer",
  },
  statusText: {
    color: "#f0f0f0",
    margin: 0,
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  balanceContainer: {
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  },
  balanceIndicator: {
    backgroundColor: "#5865f2", // Discord-like blue
    color: "#FFFFFF",
    padding: "3px 8px",
    borderRadius: "10px",
    fontSize: "0.9em",
    fontWeight: "bold",
  },
};
