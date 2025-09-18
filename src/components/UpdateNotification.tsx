import { useEffect, useState } from "react"
import {
  getUpdateState,
  applyUpdate,
  UPDATE_READY,
  UPDATE_ERROR,
} from "@/lib/updateService"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UpdateServiceState } from "@/types/common"

const UpdateNotification = () => {
  const [updateState, setUpdateState] =
    useState<UpdateServiceState>(getUpdateState())
  const [visible, setVisible] = useState<boolean>(false)

  useEffect(() => {
    // Set initial state
    setUpdateState(getUpdateState())

    // Listen for update events
    const handleUpdateReady = (event: CustomEvent<UpdateServiceState>) => {
      setUpdateState(event.detail)
      setVisible(true)
    }

    const handleUpdateError = (
      event: CustomEvent<{ outdated: boolean; message: string }>
    ) => {
      if (event.detail.outdated) {
        setUpdateState({
          ...getUpdateState(),
          status: "outdated",
          needsRefresh: true,
        })
        setVisible(true)
      }
    }

    // Register event listeners
    window.addEventListener(UPDATE_READY, handleUpdateReady as EventListener)
    window.addEventListener(UPDATE_ERROR, handleUpdateError as EventListener)

    // Clean up event listeners
    return () => {
      window.removeEventListener(
        UPDATE_READY,
        handleUpdateReady as EventListener
      )
      window.removeEventListener(
        UPDATE_ERROR,
        handleUpdateError as EventListener
      )
    }
  }, [])

  // No need to show if no update is needed
  if (!visible || !updateState.needsRefresh) {
    return null
  }

  // Handle update action
  const handleUpdate = () => {
    // Store current version to show What's New after update completes
    if (updateState.currentVersion) {
      localStorage.setItem("show-whats-new-version", updateState.currentVersion)
    }
    applyUpdate()
  }

  // Handle dismiss action (only for non-critical updates)
  const handleDismiss = () => {
    setVisible(false)
  }

  // Different messages based on status
  const getMessage = () => {
    switch (updateState.status) {
      case "update-ready":
        return "A new version is available. Update now for the latest features."
      case "outdated":
        return "Your app is outdated and must be updated to continue working properly."
      default:
        return "Please update the app to continue."
    }
  }

  const isForced = updateState.status === "outdated"

  return (
    <div
      className={cn(
        "fixed z-50 rounded-lg shadow-lg transition-all",
        isForced
          ? "inset-x-0 bottom-0 bg-background/95 backdrop-blur-md"
          : "bottom-4 right-4 bg-background"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 space-x-4">
        <div className="text-xl">{isForced ? "⚠️" : "🔄"}</div>
        <div className="flex-1 text-sm">{getMessage()}</div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleUpdate}>Update Now</Button>
          {!isForced && (
            <Button variant="outline" onClick={handleDismiss}>
              Later
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpdateNotification
