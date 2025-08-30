import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { usePlatformContext } from "@/hooks/usePlatform"
import { SmartphoneIcon, DownloadIcon, XIcon } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const PWA_INSTALL_DISMISSED_KEY = "pwa-install-dismissed"
const PWA_INSTALL_DISMISSED_VERSION_KEY = "pwa-install-dismissed-version"

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const { isPWA, isIOS, isMobile } = usePlatformContext()

  // Check if user has dismissed the prompt for this version
  const getCurrentVersion = useCallback(() => {
    try {
      return window.localStorage.getItem("app-version") || "1.0.0"
    } catch {
      return "1.0.0"
    }
  }, [])

  const isDismissedForCurrentVersion = useCallback(() => {
    try {
      const dismissed = window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)
      const dismissedVersion = window.localStorage.getItem(
        PWA_INSTALL_DISMISSED_VERSION_KEY
      )
      const currentVersion = getCurrentVersion()

      return dismissed === "true" && dismissedVersion === currentVersion
    } catch {
      return false
    }
  }, [getCurrentVersion])

  const setDismissedForCurrentVersion = useCallback(() => {
    try {
      const currentVersion = getCurrentVersion()
      window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, "true")
      window.localStorage.setItem(
        PWA_INSTALL_DISMISSED_VERSION_KEY,
        currentVersion
      )
    } catch {
      // Ignore localStorage errors
    }
  }, [getCurrentVersion])

  // Check if app is already installed
  const isAppInstalled = useCallback(() => {
    return isPWA || window.matchMedia("(display-mode: standalone)").matches
  }, [isPWA])

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Show prompt if not dismissed and not already installed
      if (!isDismissedForCurrentVersion() && !isAppInstalled()) {
        setIsVisible(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
    }
  }, [isDismissedForCurrentVersion, isAppInstalled])

  // Listen for update events to re-show prompt
  useEffect(() => {
    const handleUpdateReady = () => {
      // Re-show install prompt after updates if not already installed
      if (!isAppInstalled() && deferredPrompt) {
        setIsVisible(true)
      }
    }

    window.addEventListener("update-ready", handleUpdateReady)

    return () => {
      window.removeEventListener("update-ready", handleUpdateReady)
    }
  }, [deferredPrompt, isAppInstalled])

  // Handle iOS PWA installation (show manual instructions)
  const handleIOSInstall = () => {
    // For iOS, we need to show instructions since beforeinstallprompt isn't supported
    alert(
      "To install this app on your iOS device:\n\n" +
        "1. Tap the Share button in Safari\n" +
        "2. Scroll down and tap 'Add to Home Screen'\n" +
        "3. Tap 'Add' to confirm"
    )
    handleDismiss()
  }

  // Handle Android/Chrome PWA installation
  const handleInstall = async () => {
    if (!deferredPrompt) return

    setIsInstalling(true)

    try {
      await deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice

      if (result.outcome === "accepted") {
        setIsVisible(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error("PWA installation error:", error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setDismissedForCurrentVersion()
  }

  // Don't show if already installed or dismissed
  if (!isVisible || isAppInstalled()) {
    return null
  }

  // Don't show on desktop unless deferredPrompt is available
  if (!isMobile && !deferredPrompt) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-background border border-border rounded-lg shadow-lg transition-all duration-300 ease-in-out",
        "bottom-4 right-4 max-w-sm w-full mx-4 md:mx-0",
        "animate-in slide-in-from-bottom-2"
      )}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <SmartphoneIcon className="w-5 h-5 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Install Ditto App
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-auto p-1 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Get the full app experience with faster loading and offline
              access.
            </p>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          {isIOS ? (
            <Button
              onClick={handleIOSInstall}
              size="sm"
              className="flex-1"
              disabled={isInstalling}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Install
            </Button>
          ) : (
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1"
              disabled={isInstalling || !deferredPrompt}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              {isInstalling ? "Installing..." : "Install"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={isInstalling}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  )
}
