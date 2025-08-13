import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { getTopSubjects } from "@/api/kg"
import { getConversationCount } from "@/api/userContent"
import { Subject } from "@/types/common"

export interface MemoryStats {
  totalMemoryCount: number
  topSubjects: Subject[]
  loading: boolean
  error: string | null
}

export function useMemoryStats(limit: number = 15): MemoryStats {
  const { user } = useAuth()
  const [totalMemoryCount, setTotalMemoryCount] = useState(0)
  const [topSubjects, setTopSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    async function fetchMemoryStats() {
      try {
        setLoading(true)
        setError(null)

        // Fetch both total memory count and top subjects in parallel
        const [memoryCountResult, topSubjectsResult] = await Promise.all([
          getConversationCount(user!.uid),
          getTopSubjects({ userID: user!.uid, limit }),
        ])

        // Handle memory count result
        if (memoryCountResult instanceof Error) {
          throw memoryCountResult
        }
        setTotalMemoryCount(memoryCountResult.count)

        // Handle top subjects result
        if (topSubjectsResult.err) {
          console.warn("Failed to fetch top subjects:", topSubjectsResult.err)
          setTopSubjects([])
        } else if (topSubjectsResult.ok) {
          setTopSubjects(topSubjectsResult.ok.results)
        }
      } catch (err) {
        console.error("Error fetching memory stats:", err)
        setError(
          err instanceof Error ? err.message : "Failed to fetch memory stats"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMemoryStats()

    // Listen for memory-related events to refetch stats
    const handleMemoryUpdate = () => fetchMemoryStats()
    window.addEventListener("memoryUpdated", handleMemoryUpdate)
    window.addEventListener("memoryDeleted", handleMemoryUpdate)

    return () => {
      window.removeEventListener("memoryUpdated", handleMemoryUpdate)
      window.removeEventListener("memoryDeleted", handleMemoryUpdate)
    }
  }, [user?.uid, limit])

  return {
    totalMemoryCount,
    topSubjects,
    loading,
    error,
  }
}
