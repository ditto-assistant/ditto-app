import React, { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";
import { FaBrain, FaTrash, FaTools } from "react-icons/fa";
import { IoSettingsSharp, IoExtensionPuzzle } from "react-icons/io5";
import "./MemoryOverlay.css";

import {
  resetConversation,
  deleteAllUserImagesFromFirebaseStorageBucket,
} from "../control/firebase";
import { useBalance } from "../hooks/useBalance";
import ModelDropdown from "./ModelDropdown";
import ModelDropdownImage from "./ModelDropdownImage";
import { useModelPreferences } from "../hooks/useModelPreferences";
import {
  IMAGE_GENERATION_MODELS,
  isPremiumModel,
  DEFAULT_PREFERENCES,
} from "../constants";
import FullScreenSpinner from "./LoadingSpinner";
import ModelPreferencesModal from "./ModelPreferencesModal";
import MemoryControlsModal from "./MemoryControlsModal";
import AgentToolsModal from "./AgentToolsModal";
const darkModeColors = {
  primary: "#7289DA",
  text: "#FFFFFF",
  foreground: "#23272A",
  cardBg: "#2F3136",
  dangerRed: "#ED4245",
  dangerGradient: "linear-gradient(180deg, #ED4245 0%, #A12D2F 100%)",
  success: "#3BA55D",
  hover: "#4752C4",
};

function MemoryOverlay({ closeOverlay }) {
  const overlayContentRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const {
    preferences,
    loading: prefsLoading,
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
    // Trigger the animation after component mount
    setTimeout(() => setIsVisible(true), 50);

    const handleClickOutside = (event) => {
      if (
        overlayContentRef.current &&
        !overlayContentRef.current.contains(event.target)
      ) {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!balance.loading && !balance.ok?.hasPremium) {
      let mainSwitch = false;
      let programmerSwitch = false;
      if (isPremiumModel(preferences.mainModel)) {
        console.log("mainSwitch", preferences.mainModel);
        mainSwitch = true;
        updatePreferences({ mainModel: "llama-3-2" });
      }
      if (isPremiumModel(preferences.programmerModel)) {
        console.log("programmerSwitch", preferences.programmerModel);
        programmerSwitch = true;
        updatePreferences({ programmerModel: "llama-3-2" });
      }
      if (mainSwitch || programmerSwitch) {
        alert(
          "Your balance is too low for premium models. Switching to Llama 3.2."
        );
      }
    }
  }, [balance, preferences, updatePreferences]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(closeOverlay, 300); // Wait for the animation to finish before closing
  };

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

  const handleOverlayClick = (e) => {
    // Only close if clicking the main overlay background
    if (e.target.className === "MemoryOverlay") {
      handleClose();
    }
  };

  const handleContentClick = (e) => {
    // Prevent clicks inside content from reaching overlay
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={closeOverlay}>
      <div
        className="modal-content memory-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Agent Settings</h3>
          <MdClose className="close-icon" onClick={closeOverlay} />
        </div>

        <div className="modal-body">
          <div className="settings-buttons">
            <button
              className="settings-button"
              onClick={() => setShowModelPrefs(true)}
            >
              <IoSettingsSharp className="button-icon" />
              <span>Model Preferences</span>
            </button>

            <button
              className="settings-button"
              onClick={() => setShowMemoryControls(true)}
            >
              <FaBrain className="button-icon" />
              <span>Memory Controls</span>
            </button>

            <button
              className="settings-button"
              onClick={() => setShowAgentTools(true)}
            >
              <IoExtensionPuzzle className="button-icon" />
              <span>Agent Tools</span>
            </button>

            <div className="memory-manager">
              <div className="card-header">
                <FaTrash className="card-icon" />
                <h4>Memory Manager</h4>
              </div>
              <button className="danger-button" onClick={deleteAllMemory}>
                Delete All Memory
              </button>
            </div>
          </div>
        </div>

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
            hasEnoughBalance={balance.ok?.hasPremium}
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
      </div>
    </div>
  );
}

const styles = {
  overlayHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    padding: "0 4px",
  },
  overlayHeaderText: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "600",
    color: darkModeColors.text,
  },
  closeIcon: {
    fontSize: "24px",
    cursor: "pointer",
    color: darkModeColors.text,
    opacity: 0.7,
    transition: "opacity 0.2s ease",
    "&:hover": {
      opacity: 1,
    },
  },
  card: {
    backgroundColor: darkModeColors.cardBg,
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  cardIcon: {
    fontSize: "20px",
    marginRight: "12px",
    color: darkModeColors.primary,
  },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: darkModeColors.text,
  },
  cardContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  modelSelector: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  modelLabel: {
    fontSize: "14px",
    color: darkModeColors.text,
    opacity: 0.8,
  },
  memoryControl: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  memoryControlHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memoryControlTitle: {
    fontSize: "14px",
    color: darkModeColors.text,
    fontWeight: "500",
  },
  activeIndicator: {
    fontSize: "12px",
    color: darkModeColors.success,
    backgroundColor: `${darkModeColors.success}20`,
    padding: "4px 8px",
    borderRadius: "4px",
  },
  inactiveIndicator: {
    fontSize: "12px",
    color: darkModeColors.dangerRed,
    backgroundColor: `${darkModeColors.dangerRed}20`,
    padding: "4px 8px",
    borderRadius: "4px",
  },
  button: {
    padding: "10px",
    color: darkModeColors.text,
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s ease",
    "&:hover": {
      filter: "brightness(1.1)",
    },
  },
  balanceWarning: {
    color: "#ED4245",
    fontSize: "12px",
    marginTop: "4px",
    fontStyle: "italic",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100px", // Adjust as needed
    width: "100%",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    gap: "16px",
  },
  errorText: {
    color: darkModeColors.dangerRed,
    textAlign: "center",
    margin: 0,
    fontSize: "14px",
  },
};

export default MemoryOverlay;
