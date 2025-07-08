import { useEffect, useCallback } from "react"
import { PersonalityStorage } from "@/utils/personalityStorage"
import { routes } from "@/firebaseConfig"
import { auth } from "@/lib/firebase"

/**
 * Hook to preload personality assessments on app startup
 * Uses localStorage first, only fetches from API if cache is stale or missing
 */
export function usePersonalityPreload(userId: string | undefined) {
  const preloadAssessments = useCallback(async () => {
    if (!userId) return

    try {
      // Check if we have fresh cached data
      if (PersonalityStorage.isCacheFresh(userId)) {
        return
      }

      // Only fetch from API if cache is stale or missing
      console.log("🧠 Preloading personality assessments from API")
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()
      const response = await fetch(routes.personalityAssessments, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        PersonalityStorage.set(userId, data.assessments || [])
        console.log(
          `🧠 Preloaded ${data.assessments?.length || 0} personality assessments`
        )
      } else {
        console.warn(
          "🧠 Failed to preload personality assessments:",
          response.status
        )
      }
    } catch (error) {
      console.error("🧠 Error preloading personality assessments:", error)
    }
  }, [userId])

  useEffect(() => {
    // Preload assessments when user changes
    preloadAssessments()
  }, [preloadAssessments])

  return {
    preloadAssessments,
  }
}
