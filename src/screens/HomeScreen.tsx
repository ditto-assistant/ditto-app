import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "react-router"
import ChatFeed from "@/components/ChatFeed"
import SendMessage from "@/components/SendMessage"
import CameraModal from "@/components/CameraModal"
import TermsOfServiceDialog from "@/components/ui/TermsOfServiceDialog"
import FullScreenSpinner from "@/components/ui/loading/LoadingSpinner"
import { useBalance } from "@/hooks/useBalance"
import { ModalId, useModal } from "@/hooks/useModal"
import { useTOSCheck } from "@/hooks/useTOSCheck"
import useWhatsNew from "@/hooks/useWhatsNew"
import { getUpdateState } from "@/utils/updateService"

export default function HomeScreen() {
  const balance = useBalance()
  const { createOpenHandler } = useModal()
  const [searchParams] = useSearchParams()
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  // Use the TOS check hook to determine if we need to show the TOS dialog
  const { showTOS, setShowTOS } = useTOSCheck()
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
  }

  const handleCameraClose = () => {
    setIsCameraOpen(false)
  }

  const handleCaptureImage = (imageDataURL: string) => {
    setCapturedImage(imageDataURL)
  }

  return (
    <div className="app fixed inset-0 touch-pan-y flex flex-col">
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

      <CameraModal
        isOpen={isCameraOpen}
        onClose={handleCameraClose}
        onCapture={handleCaptureImage}
      />

      <TermsOfServiceDialog
        open={showTOS}
        onOpenChange={setShowTOS}
        isNewAccount={true} // Always show Accept/Decline for users who haven't accepted TOS
      />
    </div>
  )
}
