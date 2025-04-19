import { useState, useEffect, useCallback } from "react"
import { getUpdateState } from "@/utils/updateService"
import { useModal } from "./useModal"
import { auth } from "@/control/firebase"
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore"

interface UseWhatsNewReturn {
  openWhatsNew: (version?: string) => void
  currentVersion: string | null
}

const STORAGE_KEY = "whats-new-dismissed-versions"

/**
 * Hook to manage What's New dialog visibility
 *
 * Features:
 * - Automatically shows What's New when app is updated
 * - Can manually trigger showing What's New for any version
 * - Only shows What's New once per version using Firebase or localStorage
 */
export default function useWhatsNew(): UseWhatsNewReturn {
  const { createOpenHandler } = useModal()
  const openWhatsNewModal = createOpenHandler("whatsNew")
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)

  // Get dismissed versions from localStorage or Firebase
  const getDismissedVersions = useCallback(async () => {
    try {
      const userId = auth.currentUser?.uid

      // Try to get from Firebase if user is authenticated
      if (userId) {
        const db = getFirestore()
        const userPrefsRef = doc(
          db,
          "users",
          userId,
          "app_preferences",
          "whatsNew"
        )
        const userPrefsDoc = await getDoc(userPrefsRef)

        if (userPrefsDoc.exists()) {
          return userPrefsDoc.data().dismissedVersions || []
        }
      }
    } catch (error) {
      console.error("Error reading dismissed versions from Firebase:", error)
    }

    // Fall back to localStorage
    const savedVersions = localStorage.getItem(STORAGE_KEY)
    return savedVersions ? JSON.parse(savedVersions) : []
  }, [])

  // Save dismissed version to localStorage and Firebase
  const saveDismissedVersion = useCallback(
    async (version: string) => {
      try {
        const dismissedVersions = await getDismissedVersions()
        if (dismissedVersions.includes(version)) return

        const newDismissedVersions = [...dismissedVersions, version]

        // Save to localStorage first as a fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDismissedVersions))

        // Save to Firebase if user is authenticated
        const userId = auth.currentUser?.uid
        if (userId) {
          const db = getFirestore()
          const userPrefsRef = doc(
            db,
            "users",
            userId,
            "app_preferences",
            "whatsNew"
          )
          await setDoc(
            userPrefsRef,
            { dismissedVersions: newDismissedVersions },
            { merge: true }
          )
        }
      } catch (error) {
        console.error("Error saving dismissed version:", error)
      }
    },
    [getDismissedVersions]
  )

  // Check if we should show the modal for a specific version
  const shouldShowForVersion = useCallback(
    async (version: string) => {
      const dismissedVersions = await getDismissedVersions()
      return !dismissedVersions.includes(version)
    },
    [getDismissedVersions]
  )

  // Open What's New modal
  const openWhatsNew = useCallback(
    async (version?: string) => {
      const versionToShow = version || getUpdateState().currentVersion

      // Only open if this version hasn't been dismissed
      if (await shouldShowForVersion(versionToShow)) {
        setCurrentVersion(versionToShow)
        openWhatsNewModal()

        // Mark this version as seen
        await saveDismissedVersion(versionToShow)
      }
    },
    [openWhatsNewModal, shouldShowForVersion, saveDismissedVersion]
  )

  // Check on mount if we should show What's New
  useEffect(() => {
    const checkForUpdate = async () => {
      const updateState = getUpdateState()

      if (updateState.justUpdated) {
        // Wait a moment before showing What's New
        setTimeout(async () => {
          // Only show if user hasn't seen this version yet
          if (await shouldShowForVersion(updateState.currentVersion)) {
            setCurrentVersion(updateState.currentVersion)
            openWhatsNewModal()
            await saveDismissedVersion(updateState.currentVersion)
          }
        }, 1500)
      }
    }

    checkForUpdate()
  }, [openWhatsNewModal, shouldShowForVersion, saveDismissedVersion])

  return {
    openWhatsNew,
    currentVersion
  }
}
