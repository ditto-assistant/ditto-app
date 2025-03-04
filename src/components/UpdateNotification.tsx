import { useEffect, useState } from "react";
import {
  getUpdateState,
  applyUpdate,
  UPDATE_READY,
  UPDATE_ERROR,
  UpdateServiceState,
} from "@/utils/updateService";
import "./UpdateNotification.css";

const UpdateNotification = () => {
  const [updateState, setUpdateState] =
    useState<UpdateServiceState>(getUpdateState());
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Set initial state
    setUpdateState(getUpdateState());

    // Listen for update events
    const handleUpdateReady = (event: CustomEvent<UpdateServiceState>) => {
      setUpdateState(event.detail);
      setVisible(true);
    };

    const handleUpdateError = (
      event: CustomEvent<{ outdated: boolean; message: string }>,
    ) => {
      if (event.detail.outdated) {
        setUpdateState({
          ...getUpdateState(),
          status: "outdated",
          needsRefresh: true,
        });
        setVisible(true);
      }
    };

    // Register event listeners
    window.addEventListener(UPDATE_READY, handleUpdateReady as EventListener);
    window.addEventListener(UPDATE_ERROR, handleUpdateError as EventListener);

    // Clean up event listeners
    return () => {
      window.removeEventListener(
        UPDATE_READY,
        handleUpdateReady as EventListener,
      );
      window.removeEventListener(
        UPDATE_ERROR,
        handleUpdateError as EventListener,
      );
    };
  }, []);

  // No need to show if no update is needed
  if (!visible || !updateState.needsRefresh) {
    return null;
  }

  // Handle update action
  const handleUpdate = () => {
    applyUpdate();
  };

  // Handle dismiss action (only for non-critical updates)
  const handleDismiss = () => {
    setVisible(false);
  };

  // Different messages based on status
  const getMessage = () => {
    switch (updateState.status) {
      case "update-ready":
        return "A new version is available. Update now for the latest features.";
      case "outdated":
        return "Your app is outdated and must be updated to continue working properly.";
      default:
        return "Please update the app to continue.";
    }
  };
  
  // Check if any lazy components might be stale
  const mightHaveStaleLazyComponents = updateState.justUpdated || localStorage.getItem("force-reload-lazy") === "true";

  const isForced = updateState.status === "outdated";

  return (
    <div className={`update-notification ${isForced ? "forced" : ""}`}>
      <div className="update-notification-content">
        <div className="update-notification-icon">{isForced ? "⚠️" : "🔄"}</div>
        <div className="update-notification-message">
          {getMessage()}
          {mightHaveStaleLazyComponents && (
            <div className="update-note">
              <small>If you notice incorrect version numbers, please refresh the page.</small>
            </div>
          )}
        </div>
        <div className="update-notification-actions">
          <button className="update-button" onClick={handleUpdate}>
            Update Now
          </button>

          {!isForced && (
            <button className="dismiss-button" onClick={handleDismiss}>
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
