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
    // Trigger the animation after component mount
    const handleClickOutside = (event) => {
      if (
        overlayContentRef.current &&
        !overlayContentRef.current.contains(event.target)
      ) {
        setTimeout(closeOverlay, 300); // Wait for the animation to finish before closing
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      </div>
    </div>
  );
}

export default MemoryOverlay;
