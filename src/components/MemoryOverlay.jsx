import React, { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";
import { FaBrain, FaTrash, FaTools } from "react-icons/fa";
import { IoSettingsSharp, IoExtensionPuzzle } from "react-icons/io5";
import FullScreenSpinner from "@/components/LoadingSpinner";
import "./MemoryOverlay.css";
import {
  resetConversation,
  deleteAllUserImagesFromFirebaseStorageBucket,
} from "@/control/firebase";
import { useBalance } from "@/hooks/useBalance";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import ModelPreferencesModal from "@/components/ModelPreferencesModal";
import MemoryControlsModal from "@/components/MemoryControlsModal";
import AgentToolsModal from "@/components/AgentToolsModal";
import { motion, AnimatePresence } from "framer-motion";

function MemoryOverlay({ closeOverlay }) {
  const overlayContentRef = useRef(null);
  const {
    preferences,
    isLoading: prefsLoading,
    error: prefsError,
    updatePreferences,
  } = useModelPreferences();
  const [memoryStatus, setMemoryStatus] = useState({
    longTerm:
      JSON.parse(localStorage.getItem("deactivateLongTermMemory")) || false,
    shortTerm:
      JSON.parse(localStorage.getItem("deactivateShortTermMemory")) || false,
  });
  const balance = useBalance();
  const [showModelPrefs, setShowModelPrefs] = useState(false);
  const [showMemoryControls, setShowMemoryControls] = useState(false);
  const [showAgentTools, setShowAgentTools] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        overlayContentRef.current &&
        !overlayContentRef.current.contains(event.target)
      ) {
        closeOverlay();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeOverlay]);

  const deleteAllMemory = async () => {
    // Create and show the custom confirmation dialog
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";
    dialog.innerHTML = `
            <div class="confirmation-content">
                <h3>Delete All Memory</h3>
                <p>Are you sure you want to delete all memory? This action cannot be undone.</p>
                <div class="confirmation-buttons">
                    <button class="cancel-button">Cancel</button>
                    <button class="confirm-button">Delete</button>
                </div>
            </div>
        `;

    document.body.appendChild(dialog);

    // Add fade-in effect
    setTimeout(() => dialog.classList.add("visible"), 50);

    // Handle button clicks
    return new Promise((resolve) => {
      const handleCancel = () => {
        dialog.classList.remove("visible");
        setTimeout(() => dialog.remove(), 300);
        resolve(false);
      };
      const handleConfirm = async () => {
        dialog.classList.remove("visible");
        setTimeout(() => dialog.remove(), 300);
        console.log("Resetting conversation history...");
        localStorage.setItem("resetMemory", "true");
        const userID = localStorage.getItem("userID");
        localStorage.removeItem("prompts");
        localStorage.removeItem("responses");
        localStorage.removeItem("timestamps");
        localStorage.removeItem("pairIDs");
        localStorage.removeItem("histCount");
        await resetConversation(userID);
        await deleteAllUserImagesFromFirebaseStorageBucket(userID);
        // Dispatch a custom event to notify other components
        const event = new CustomEvent("memoryDeleted", {
          detail: { newHistCount: 0 },
        });
        window.dispatchEvent(event);
        // Close the overlay after deletion
        closeOverlay();
        resolve(true);
      };
      dialog
        .querySelector(".cancel-button")
        .addEventListener("click", handleCancel);
      dialog
        .querySelector(".confirm-button")
        .addEventListener("click", handleConfirm);
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) handleCancel();
      });
    });
  };

  const toggleMemoryActivation = (memoryType) => {
    setMemoryStatus((prev) => {
      const newStatus = !prev[memoryType];
      if (memoryType === "longTerm") {
        localStorage.setItem("deactivateLongTermMemory", newStatus);
        if (!newStatus) {
          localStorage.removeItem("longTermMemory");
        }
      } else if (memoryType === "shortTerm") {
        localStorage.setItem("deactivateShortTermMemory", newStatus);
        if (!newStatus) {
          localStorage.removeItem("shortTermMemory");
        }
      }
      return {
        ...prev,
        [memoryType]: newStatus,
      };
    });
  };

  if (prefsLoading) {
    return <FullScreenSpinner text="Loading agent settings..." />;
  }
  if (balance.isLoading) {
    return <FullScreenSpinner text="Loading balance..." />;
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closeOverlay}
    >
      <motion.div
        ref={overlayContentRef}
        className="modal-content memory-modal"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Agent Settings</h3>
          <MdClose className="close-icon" onClick={closeOverlay} />
        </div>

        <div className="modal-body">
          <div className="settings-buttons">
            <motion.button
              className="settings-button"
              onClick={() => setShowModelPrefs(true)}
              whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
              whileTap={{ scale: 0.98 }}
            >
              <IoSettingsSharp className="button-icon" />
              <span>Model Preferences</span>
            </motion.button>

            <motion.button
              className="settings-button"
              onClick={() => setShowMemoryControls(true)}
              whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
              whileTap={{ scale: 0.98 }}
            >
              <FaBrain className="button-icon" />
              <span>Memory Controls</span>
            </motion.button>

            <motion.button
              className="settings-button"
              onClick={() => setShowAgentTools(true)}
              whileHover={{ y: -2, boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
              whileTap={{ scale: 0.98 }}
            >
              <IoExtensionPuzzle className="button-icon" />
              <span>Agent Tools</span>
            </motion.button>

            <motion.div
              className="memory-manager"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="card-header">
                <FaTrash className="card-icon" />
                <h4>Memory Manager</h4>
              </div>
              <motion.button
                className="danger-button"
                onClick={deleteAllMemory}
                whileHover={{ y: -2, filter: "brightness(1.1)" }}
                whileTap={{ scale: 0.98 }}
              >
                Delete All Memory
              </motion.button>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {showModelPrefs && (
            <ModelPreferencesModal
              preferences={preferences}
              updatePreferences={updatePreferences}
              onClose={(e) => {
                if (e) {
                  e.stopPropagation();
                }
                setShowModelPrefs(false);
              }}
              hasEnoughBalance={balance.data?.hasPremium}
            />
          )}

          {showMemoryControls && (
            <MemoryControlsModal
              memoryStatus={memoryStatus}
              toggleMemoryActivation={toggleMemoryActivation}
              onClose={() => setShowMemoryControls(false)}
            />
          )}

          {showAgentTools && (
            <AgentToolsModal
              preferences={preferences}
              updatePreferences={updatePreferences}
              onClose={() => setShowAgentTools(false)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default MemoryOverlay;
