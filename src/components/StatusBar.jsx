import { useState, useEffect } from "react";
import { FaBrain, FaLaptopCode } from "react-icons/fa";
import { useBalance } from "../hooks/useBalance";
import { LoadingSpinner } from "./LoadingSpinner";
import { useMemoryCount } from "../hooks/useMemoryCount";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import "./StatusBar.css";

export default function StatusBar({ onMemoryClick, onScriptsClick }) {
  const balance = useBalance();
  const memoryCount = useMemoryCount();
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
      <div className="center-section">
        <motion.div
          className="icon-button"
          onClick={onScriptsClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaLaptopCode />
        </motion.div>
        <motion.div
          className="icon-button"
          onClick={onMemoryClick}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaBrain />
        </motion.div>
      </div>

      <div className="right-section">
        <motion.div
          className="balance-container"
          onClick={toggleBalanceDisplay}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="balance-indicator">
            {balance.isLoading ? (
              <LoadingSpinner size={14} inline={true} />
            ) : showMemories ? (
              `${memoryCount.count} Memories`
            ) : showUSD ? (
              balance.data?.usd
            ) : (
              balance.data?.balance
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
