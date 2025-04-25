import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { useTermsOfService } from "./useTermsOfService"

interface UseTOSCheckResult {
  showTOS: boolean
  setShowTOS: (show: boolean) => void
  tos: ReturnType<typeof useTermsOfService>["tos"]
  hasAccepted: boolean
  loading: boolean
}

/**
 * Hook to check if a user needs to see the Terms of Service
 * @returns An object with the TOS status and dialog control functions
 */
export function useTOSCheck(): UseTOSCheckResult {
  const { user } = useAuth()
  const [showTOS, setShowTOS] = useState(false)

  const { tos, status, tosLoading, statusLoading } = useTermsOfService(
    user?.uid
  )

  // Check if the user has already accepted the current TOS
  useEffect(() => {
    // Skip if no user is logged in or we're still loading
    if (!user?.uid || tosLoading || statusLoading) return

    // If we've already successfully checked the status and have a result
    if (status && tos) {
      // Only show TOS if user hasn't accepted
      if (!status.has_accepted) {
        setShowTOS(true)
      }
      return
    }

    // Otherwise, use localStorage as a fallback
    // But this will be phased out in favor of the backend check
    if (!localStorage.getItem("hasSeenTOS")) {
      setShowTOS(true)
    }
  }, [user, tosLoading, statusLoading, status, tos])

  return {
    showTOS,
    setShowTOS,
    tos,
    hasAccepted: status?.has_accepted || false,
    loading: tosLoading || statusLoading,
  }
}
