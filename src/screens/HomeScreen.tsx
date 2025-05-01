import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "react-router"
import { motion, AnimatePresence } from "framer-motion"
import { FlipVertical, X } from "lucide-react"
import ChatFeed from "@/components/ChatFeed"
import SendMessage from "@/components/SendMessage"
import FullScreenEditor from "@/screens/Editor/FullScreenEditor"
import TermsOfServiceDialog from "@/components/ui/TermsOfServiceDialog"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import { useBalance } from "@/hooks/useBalance"
import { ModalId, useModal } from "@/hooks/useModal"
import { useTOSCheck } from "@/hooks/useTOSCheck"
import { ScriptType, useScripts } from "@/hooks/useScripts"
import useWhatsNew from "@/hooks/useWhatsNew"
import { getUpdateState } from "@/utils/updateService"

interface ScriptData {
  name: string
  content: string
  scriptType: ScriptType
  onSaveCallback?: (newContent: string) => Promise<void>
}

export default function HomeScreen() {
  const balance = useBalance()
  const { createOpenHandler } = useModal()
  const [searchParams] = useSearchParams()
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  // Use the TOS check hook to determine if we need to show the TOS dialog
  const { showTOS, setShowTOS } = useTOSCheck()
  const [fullScreenEdit, setFullScreenEdit] = useState<ScriptData | null>(null)
  const { setSelectedScript, saveScript } = useScripts()
  const { openWhatsNew } = useWhatsNew()

  const appBodyRef = useRef<HTMLDivElement>(null)

  // Handle URL parameters to open modals directly
  useEffect(() => {
    const openModal = searchParams.get("openModal") as ModalId
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

  const startCamera = (useFrontCamera: boolean) => {
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
    const stream = videoRef.current?.srcObject as MediaStream
    if (stream) {
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const handleSnap = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const imageDataURL = canvasRef.current.toDataURL("image/png")
        setCapturedImage(imageDataURL)
        handleCameraClose()
      }
    }
  }

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera)
    stopCameraFeed()
    startCamera(!isFrontCamera)
  }

  useEffect(() => {
    const handleEditScript = (event: CustomEvent<{ script: ScriptData }>) => {
      const { script } = event.detail
      setFullScreenEdit({
        ...script,
        onSaveCallback: async (newContent: string) => {
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

    window.addEventListener("editScript", handleEditScript as EventListener)
    return () => {
      window.removeEventListener(
        "editScript",
        handleEditScript as EventListener
      )
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
    <div className="app h-[100svh] fixed inset-0 touch-pan-y flex flex-col">
      <Suspense fallback={<FullScreenSpinner />}>
        <div className="flex-1 flex flex-col overflow-hidden pb-0">
          <ChatFeed ref={appBodyRef} />
          <SendMessage
            onCameraOpen={handleCameraOpen}
            capturedImage={capturedImage}
            onClearCapturedImage={() => setCapturedImage(null)}
            onStop={() => {
              balance.refetch()
            }}
          />
        </div>
      </Suspense>

      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCameraClose}
          >
            <motion.div
              className="bg-card rounded-lg overflow-hidden max-w-[90%] max-h-[90%] flex flex-col"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <video
                ref={videoRef}
                autoPlay
                className="w-full object-contain max-h-[calc(90vh-100px)]"
              ></video>
              <div className="flex justify-around items-center w-full p-4 bg-muted">
                <button
                  onClick={toggleCamera}
                  className="p-2 rounded-full bg-background/10 text-foreground hover:bg-background/20 transition"
                >
                  <FlipVertical className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSnap}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
                >
                  Snap
                </button>
                <button
                  onClick={handleCameraClose}
                  className="px-4 py-2 rounded-full bg-background/20 text-foreground hover:bg-background/30 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden"></canvas>

      <TermsOfServiceDialog
        open={showTOS}
        onOpenChange={setShowTOS}
        isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
      />

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
