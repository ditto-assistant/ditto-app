import { useState, useEffect } from "react";
import StatusIcons from "./StatusIcons";
import { syncLocalScriptsWithFirestore } from "../control/firebase";
import { useBalance } from "../hooks/useBalance";
import { LoadingSpinner } from "./LoadingSpinner";
import { useMemoryCount } from "../hooks/useMemoryCount";
import { toast } from "react-hot-toast";
import { MdFeedback } from "react-icons/md";
import FeedbackModal from "./FeedbackModal";
import "./FeedbackModal.css";
import "./StatusBar.css";

export default function StatusBar({ onMemoryClick, onScriptsClick }) {
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
  const [showFeedback, setShowFeedback] = useState(false);

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
    <div className="status-bar">
      <div className="status">
        <div
          style={{
            backgroundColor: isOnline ? "green" : "red",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            marginRight: "6px",
          }}
        ></div>
        <p className="status-text">{isOnline ? "Online" : "Offline"}</p>
      </div>

      <StatusIcons
        handleBookmarkClick={handleBookmarkClick}
        handleMemoryClick={handleMemoryClick}
      />

      <div className="right-section">
        <div
          className="feedback-button"
          onClick={() => setShowFeedback(true)}
          title="Send Feedback"
        >
          <MdFeedback size={16} />
        </div>
        <div className="balance-container" onClick={toggleBalanceDisplay}>
          <span className="balance-indicator">
            {balance.isLoading ? (
              <LoadingSpinner size={14} inline={true} />
            ) : showMemories ? (
              `${memoryCount.count} Memories`
            ) : showUSD ? (
              balance.data?.usd
            ) : (
              balance.data?.balance
            )}
          </span>
        </div>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}
