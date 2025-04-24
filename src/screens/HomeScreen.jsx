import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "react-router"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import { useBalance } from "@/hooks/useBalance"
import { useModal } from "@/hooks/useModal"
import TermsOfService from "@/components/TermsOfService"
import { motion, AnimatePresence } from "framer-motion"
import { FlipVertical } from "lucide-react"
import ChatFeed from "@/components/ChatFeed"
import SendMessage from "@/components/SendMessage"
import FullScreenEditor from "@/screens/Editor/FullScreenEditor"
import { useScripts } from "@/hooks/useScripts"
import useWhatsNew from "@/hooks/useWhatsNew"
import { getUpdateState } from "@/utils/updateService"
import "@/styles/buttons.css"
import "./HomeScreen.css"

export default function HomeScreen() {
  const balance = useBalance()
  const { createOpenHandler } = useModal()
  const [searchParams] = useSearchParams()
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [showTOS, setShowTOS] = useState(() => {
    return !localStorage.getItem("hasSeenTOS")
  })
  const [fullScreenEdit, setFullScreenEdit] = useState(null)
  const { setSelectedScript, saveScript } = useScripts()
  const { openWhatsNew } = useWhatsNew()

  const appBodyRef = useRef(null)

  // Handle URL parameters to open modals directly
  useEffect(() => {
    const openModal = searchParams.get("openModal")
    const openTab = searchParams.get("openTab")
    const tokenSuccess = searchParams.get("tokenSuccess")

    // Clean up URL parameters immediately to prevent reopening on refresh
    const currentUrl = window.location.pathname
    window.history.replaceState({}, document.title, currentUrl)

    if (tokenSuccess === "true") {
      const openTokenModal = createOpenHandler("tokenCheckout")
      openTokenModal()

      // This will be detected in the TokenModal component via initialSuccess prop
      window.sessionStorage.setItem("token_success", "true")
    } else if (openModal) {
      // Use the enhanced createOpenHandler with the tab ID
      if (openModal === "settings" && openTab) {
        const openSettingsWithTab = createOpenHandler("settings", openTab)
        openSettingsWithTab()
      } else {
        const openModalHandler = createOpenHandler(openModal)
        openModalHandler()
      }
    }
  }, [searchParams, createOpenHandler])

  // Handle showing What's New modal when app is reloaded after update
  useEffect(() => {
    const forceReloadLazy = localStorage.getItem("force-reload-lazy") === "true"
    if (forceReloadLazy) {
      console.log("App mounted after update - clearing force-reload-lazy flag")
      localStorage.removeItem("force-reload-lazy")

      // Show What's New modal when app is reloaded after update
      const storedVersionToShow = localStorage.getItem("show-whats-new-version")
      if (storedVersionToShow) {
        // Use the stored version that was saved before the update
        openWhatsNew(storedVersionToShow)
        localStorage.removeItem("show-whats-new-version")
      } else {
        // Fallback to current version from updateState
        const updateState = getUpdateState()
        if (updateState.currentVersion) {
          openWhatsNew(updateState.currentVersion)
        }
      }
    }
  }, [openWhatsNew])

  const handleCameraOpen = () => {
    setIsCameraOpen(true)
    startCamera(isFrontCamera)
  }

  const handleCameraClose = () => {
    setIsCameraOpen(false)
    stopCameraFeed()
  }

  const startCamera = (useFrontCamera) => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment" },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err)
      })
  }

  const stopCameraFeed = () => {
    const stream = videoRef.current?.srcObject
    if (stream) {
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const handleSnap = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d")
      canvasRef.current.width = videoRef.current.videoWidth
      canvasRef.current.height = videoRef.current.videoHeight
      context.drawImage(videoRef.current, 0, 0)
      const imageDataURL = canvasRef.current.toDataURL("image/png")
      setCapturedImage(imageDataURL)
      handleCameraClose()
    }
  }

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera)
    stopCameraFeed()
    startCamera(!isFrontCamera)
  }

  useEffect(() => {
    const handleEditScript = (event) => {
      const { script } = event.detail
      setFullScreenEdit({
        ...script,
        onSaveCallback: async (newContent) => {
          try {
            // Use the script manager to save
            await saveScript(newContent, script.scriptType, script.name)

            // Select the script using script manager with proper field names
            setSelectedScript({
              name: script.name,
              content: newContent,
              scriptType: script.scriptType,
            })

            setFullScreenEdit(null)
            window.dispatchEvent(new Event("scriptsUpdated"))
          } catch (error) {
            console.error("Error saving:", error)
          }
        },
      })
    }

    window.addEventListener("editScript", handleEditScript)
    return () => {
      window.removeEventListener("editScript", handleEditScript)
    }
  }, [saveScript, setSelectedScript])

  useEffect(() => {
    const handleCloseFullScreenEditor = () => {
      setFullScreenEdit(null)
    }

    window.addEventListener(
      "closeFullScreenEditor",
      handleCloseFullScreenEditor
    )
    return () => {
      window.removeEventListener(
        "closeFullScreenEditor",
        handleCloseFullScreenEditor
      )
    }
  }, [])

  return (
    <div className="app">
      <Suspense fallback={<FullScreenSpinner />}>
        <div className="app-content-wrapper">
          <div className="app-body" ref={appBodyRef}>
            <ChatFeed />
          </div>
          <div className="app-footer">
            <SendMessage
              onCameraOpen={handleCameraOpen}
              capturedImage={capturedImage}
              onClearCapturedImage={() => setCapturedImage(null)}
              onStop={() => {
                balance.refetch()
              }}
            />
          </div>
        </div>
      </Suspense>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="camera-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCameraClose}
          >
            <motion.div
              className="camera-container"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <video ref={videoRef} autoPlay className="camera-feed"></video>
              <div className="camera-controls">
                <FlipVertical
                  className="flip-camera-icon"
                  onClick={toggleCamera}
                />
                <button className="camera-snap" onClick={handleSnap}>
                  Snap
                </button>
                <button className="camera-close" onClick={handleCameraClose}>
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

      {showTOS && (
        <TermsOfService
          onClose={() => setShowTOS(false)}
          isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
        />
      )}

      {fullScreenEdit && (
        <FullScreenEditor
          script={fullScreenEdit}
          onClose={() => setFullScreenEdit(null)}
          onSave={fullScreenEdit.onSaveCallback}
        />
      )}
    </div>
  )
}
