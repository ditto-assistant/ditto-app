import React, { useState, useCallback } from "react"
import { syncUserData } from "@/api/sync"
import { useAuth } from "@/hooks/useAuth"

export const useMemorySync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentStage, setCurrentStage] = useState(1)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { user } = useAuth()

  const triggerSync = useCallback(async () => {
    if (!user?.uid || isSyncing) {
      return
    }

    setIsSyncing(true)
    setCurrentStage(1) // Reset to stage 1

    // Progress callback to update stage based on real sync progress
    const onProgress = (stage: number, status: string) => {
      setCurrentStage(stage)
    }

    try {
      const result = await syncUserData(user.uid, onProgress)

      if (result.err) {
        console.error("❌ [MemorySync] Sync failed:", result.err)
        // Keep showing indicator for at least 2 seconds even on error
        setTimeout(() => {
          setIsSyncing(false)
        }, 2000)
      } else {
        setLastSyncTime(new Date())

        // Show finalizing stage first
        setCurrentStage(4)

        // Add a small delay to show completion stage, then hide indicator
        setTimeout(() => {
          setIsSyncing(false)
        }, 2000) // Show finalizing stage for 2 seconds
      }
    } catch (error) {
      console.error("❌ [MemorySync] Sync error:", error)
      // Keep showing indicator for at least 2 seconds even on error
      setTimeout(() => {
        setIsSyncing(false)
      }, 2000)
    }
  }, [user?.uid, isSyncing])

  const completeSyncIndicator = useCallback(() => {
    setIsSyncing(false)
    setCurrentStage(1) // Reset stage for next sync
  }, [])

  return {
    isSyncing,
    currentStage,
    lastSyncTime,
    triggerSync,
    completeSyncIndicator,
  }
}
