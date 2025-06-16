import React, { useState, useCallback, useEffect } from "react"
import { startSync, getSyncStatus } from "@/api/sync"
import { useAuth } from "@/hooks/useAuth"

interface SyncState {
  stage: number
}

export const useMemorySync = () => {
  const [syncsInProgress, setSyncsInProgress] = useState<Map<string, SyncState>>(
    new Map()
  )
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
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
    const pollStatuses = async () => {
      if (syncsInProgress.size === 0) return

      const messageIDs = Array.from(syncsInProgress.keys())
      const result = await getSyncStatus(messageIDs)

      if (result.ok) {
        const statuses = result.ok
        setSyncsInProgress((prev) => {
          const next = new Map(prev)
          let changed = false

          // Update statuses for ongoing jobs
          statuses.forEach((status, id) => {
            if (next.has(id) && next.get(id)?.stage !== status.stage) {
              next.set(id, status)
              changed = true
            }
          })

          // Remove completed jobs
          messageIDs.forEach((id) => {
            if (!statuses.has(id)) {
              next.delete(id)
              changed = true
            }
          })

          return changed ? next : prev
        })
      }
    }

    const interval = setInterval(pollStatuses, 2000)
    return () => clearInterval(interval)
  }, [syncsInProgress])

  return {
    syncsInProgress,
    lastSyncTime,
    triggerSync,
    checkStatuses,
  }
}
