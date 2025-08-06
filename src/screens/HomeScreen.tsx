import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "react-router"
import ChatFeed from "@/components/ChatFeed"
import SendMessage from "@/components/SendMessage"
import CameraModal from "@/components/CameraModal"
import LiveModeModal from "@/components/LiveModeModal"
import TopBar from "@/components/TopBar"
import TermsOfServiceDialog from "@/components/ui/TermsOfServiceDialog"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import { useBalance } from "@/hooks/useBalance"
import { ModalId, useModal } from "@/hooks/useModal"
import { useTOSCheck } from "@/hooks/useTOSCheck"
import useWhatsNew from "@/hooks/useWhatsNew"
import { getUpdateState } from "@/utils/updateService"
import { usePersonalityPreload } from "@/hooks/usePersonalityPreload"
import { useAuth } from "@/hooks/useAuth"


export default function HomeScreen() {
  const balance = useBalance()
  const modal = useModal()
  const { showTOS, setShowTOS } = useTOSCheck()
  const [searchParams] = useSearchParams()
  const { openWhatsNew } = useWhatsNew()
  const { user } = useAuth()

  // Camera modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  // Live Mode modal state  
  const [isLiveModeOpen, setIsLiveModeOpen] = useState(false)
  const [liveModeProcessing, setLiveModeProcessing] = useState(false)
  const [lastLiveModeResponse, setLastLiveModeResponse] = useState<string>("")

  const appBodyRef = useRef(null)

  usePersonalityPreload(user?.uid)

  // Handle URL parameters for opening modals
  useEffect(() => {
    const openModal = searchParams.get("openModal") as ModalId
    const openTab = searchParams.get("openTab")
    const tokenSuccess = searchParams.get("tokenSuccess")

    // Clean up URL parameters immediately to prevent reopening on refresh
    const currentUrl = window.location.pathname
    window.history.replaceState({}, document.title, currentUrl)

    if (tokenSuccess === "true") {
      const openTokenModal = modal.createOpenHandler("tokenCheckout")
      openTokenModal()

      // This will be detected in the TokenModal component via initialSuccess prop
      window.sessionStorage.setItem("token_success", "true")
    } else if (openModal) {
      // Use the enhanced createOpenHandler with the tab ID
      if (openModal === "settings" && openTab) {
        const openSettingsWithTab = modal.createOpenHandler("settings", openTab)
        openSettingsWithTab()
      } else {
        const openModalHandler = modal.createOpenHandler(openModal)
        openModalHandler()
      }
    }
  }, [searchParams, modal])

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
  }

  const handleCameraClose = () => {
    setIsCameraOpen(false)
  }

  const handleCaptureImage = (imageDataURL: string) => {
    setCapturedImage(imageDataURL)
  }

  // Live Mode handlers
  const handleLiveModeOpen = () => {
    setIsLiveModeOpen(true)
  }

  const handleLiveModeClose = () => {
    setIsLiveModeOpen(false)
    setLastLiveModeResponse("")
    setLiveModeProcessing(false)
  }

  const handleLiveModeSendMessage = async (message: string) => {
    setLiveModeProcessing(true)
    
    try {
      // For now, we'll simulate sending a message to the chat
      // In a full implementation, you'd want to integrate this with the 
      // existing chat system more deeply
      
      // Simulate processing time
      setTimeout(() => {
        setLiveModeProcessing(false)
        // Simulate a response - in reality this would come from the AI
        setLastLiveModeResponse(`I heard you say: "${message}". That's interesting! How can I help you with that?`)
      }, 1500)
      
    } catch (error) {
      console.error("Error sending live mode message:", error)
      setLiveModeProcessing(false)
    }
  }

  return (
    <div className="app fixed inset-0 touch-pan-y flex flex-col">
      <Suspense fallback={<FullScreenSpinner />}>
        <div className="flex flex-col h-full">
          <TopBar />
          <ChatFeed ref={appBodyRef} />
          <SendMessage
            onCameraOpen={handleCameraOpen}
            capturedImage={capturedImage}
            onClearCapturedImage={() => setCapturedImage(null)}
            onStop={() => {
              balance.refetch()
            }}
            onLiveModeClick={handleLiveModeOpen}
          />
        </div>
      </Suspense>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={handleCameraClose}
        onCapture={handleCaptureImage}
      />

      <LiveModeModal 
        isOpen={isLiveModeOpen}
        onClose={handleLiveModeClose}
        onMessageSent={(message, response) => {
          // Optional: Handle message sent in live mode
          setLastLiveModeResponse(response)
        }}
      />

      <TermsOfServiceDialog
        open={showTOS}
        onOpenChange={setShowTOS}
        isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
      />
    </div>
  )
}
