import { useState, useCallback, useEffect } from "react"
import { startSync, getSyncStatus } from "@/api/sync"
import { useAuth } from "@/hooks/useAuth"

interface SyncState {
  stage: number
}

export const useMemorySync = () => {
  const [syncsInProgress, setSyncsInProgress] = useState<
    Map<string, SyncState>
  >(new Map())
  const { user } = useAuth()

  const triggerSync = useCallback(
    async (messageId: string) => {
      if (!user?.uid) return

      if (syncsInProgress.has(messageId)) {
        return
      }

      setSyncsInProgress((prev) => new Map(prev).set(messageId, { stage: 1 }))
      await startSync(user.uid, messageId)
    },
    [user?.uid, syncsInProgress]
  )

  const checkStatuses = useCallback(async (messageIDs: string[]) => {
    if (messageIDs.length === 0) return
    const result = await getSyncStatus(messageIDs)

    if (result.ok) {
      const statuses = result.ok
      if (statuses.size > 0) {
        setSyncsInProgress((prev) => {
          const next = new Map(prev)
          statuses.forEach((status, id) => {
            if (!next.has(id)) {
              next.set(id, status)
            }
          })
          return next
        })
      }
    }
  }, [])

  useEffect(() => {
    let isCancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const pollStatuses = async () => {
      if (isCancelled) return

      // Only poll if there are syncs in progress
      if (syncsInProgress.size === 0) {
        // No active syncs, wait longer before checking again (10 seconds instead of 2)
        timeoutId = setTimeout(pollStatuses, 10000)
        return
      }

      const messageIDs = Array.from(syncsInProgress.keys())
      const result = await getSyncStatus(messageIDs)

      if (isCancelled) return

      if (result.ok) {
        const statuses = result.ok
        setSyncsInProgress((prev) => {
          // Create a mutable copy to work with
          const next = new Map(prev)
          let changed = false

          // Update statuses for ongoing jobs, only if the stage is newer
          statuses.forEach((status, id) => {
            const currentStage = next.get(id)?.stage ?? 0
            if (next.has(id) && status.stage > currentStage) {
              next.set(id, status)
              changed = true
            }
          })

          // Remove jobs that are no longer reported by the backend (i.e., completed and deleted)
          messageIDs.forEach((id) => {
            if (!statuses.has(id) && next.has(id)) {
              next.delete(id)
              changed = true
            }
          })

          return changed ? next : prev
        })
      }

      // Schedule the next poll with more frequent checking when syncs are active
      timeoutId = setTimeout(pollStatuses, 2000)
    }

    // Start the polling loop
    pollStatuses()

    return () => {
      isCancelled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [syncsInProgress])

  return {
    syncsInProgress,
    triggerSync,
    checkStatuses,
  }
}
