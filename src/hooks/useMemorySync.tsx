import React, { useState, useCallback } from "react"
import { syncUserData } from "@/api/sync"
import { useAuth } from "@/hooks/useAuth"

export const useMemorySync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentStage, setCurrentStage] = useState(1)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const { user } = useAuth()

  const triggerSync = useCallback(async () => {
    if (!user?.uid) {
      console.log("🔄 [MemorySync] No user ID available, skipping sync")
      return
    }

    if (isSyncing) {
      console.log("🔄 [MemorySync] Sync already in progress, skipping")
      return
    }

    console.log("🔄 [MemorySync] Starting memory sync for user:", user.uid)
    console.log("🔄 [MemorySync] Setting isSyncing to TRUE")
    setIsSyncing(true)
    setCurrentStage(1) // Reset to stage 1
    console.log("🔄 [MemorySync] isSyncing state should now be true")

    const syncStartTime = Date.now()
    
    // Progress callback to update stage based on real sync progress
    const onProgress = (stage: number, status: string) => {
      console.log(`🎯 [MemorySync] Stage ${stage}/4: ${status}`)
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
        const syncDuration = Date.now() - syncStartTime
        console.log(`✅ [MemorySync] Sync completed successfully in ${syncDuration}ms`)
        setLastSyncTime(new Date())
        
        // Show finalizing stage first
        console.log("🔄 [MemorySync] Setting stage 4: Finalizing...")
        setCurrentStage(4)
        
        // Add a small delay to show completion stage, then hide indicator
        console.log("🔄 [MemorySync] Sync finished, showing finalizing stage then hiding indicator")
        setTimeout(() => {
          console.log("🔄 [MemorySync] Calling setIsSyncing(false) after showing completion")
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
    console.log("✨ [MemorySync] Sync indicator animation completed, hiding indicator")
    setIsSyncing(false)
    setCurrentStage(1) // Reset stage for next sync
  }, [])

  // Debug log whenever isSyncing changes
  React.useEffect(() => {
    console.log("🔄 [MemorySync] isSyncing state changed to:", isSyncing)
  }, [isSyncing])

  return {
    isSyncing,
    currentStage,
    lastSyncTime,
    triggerSync,
    completeSyncIndicator,
  }
} 