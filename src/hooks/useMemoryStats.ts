import { useEffect } from "react"
import { useAuth } from "./useAuth"
import { getTopSubjects } from "@/api/kg"
import { getConversationCount } from "@/api/userContent"
import { Subject } from "@/types/common"
import { useQuery } from "@tanstack/react-query"

export interface MemoryStats {
  totalMemoryCount: number
  topSubjects: Subject[]
  loading: boolean
  error: string | null
}

export function useMemoryStats(limit: number = 15): MemoryStats {
  const { user } = useAuth()

  const query = useQuery<
    { totalMemoryCount: number; topSubjects: Subject[] },
    Error
  >({
    queryKey: ["memory-stats", user?.uid, limit],
    enabled: !!user?.uid,
    staleTime: 60 * 1000, // 1 minute cache
    queryFn: async () => {
      if (!user?.uid) {
        return { totalMemoryCount: 0, topSubjects: [] }
      }

      const [memoryCountResult, topSubjectsResult] = await Promise.all([
        getConversationCount(user.uid),
        getTopSubjects({ userID: user.uid, limit }),
      ])

      if (memoryCountResult instanceof Error) {
        throw memoryCountResult
      }

      let topSubjects: Subject[] = []
      if (topSubjectsResult.err) {
        // Don't fail the whole query if subjects fail; log and continue
        console.warn("Failed to fetch top subjects:", topSubjectsResult.err)
      } else if (topSubjectsResult.ok) {
        topSubjects = topSubjectsResult.ok.results
      }

      return {
        totalMemoryCount: memoryCountResult.count,
        topSubjects,
      }
    },
  })

  // Attach event listeners to refetch on memory updates/deletes
  useEffect(() => {
    if (!user?.uid) return

    const handleMemoryUpdate = () => {
      // Soft refetch
      query.refetch()
    }

    window.addEventListener("memoryUpdated", handleMemoryUpdate)
    window.addEventListener("memoryDeleted", handleMemoryUpdate)

    return () => {
      window.removeEventListener("memoryUpdated", handleMemoryUpdate)
      window.removeEventListener("memoryDeleted", handleMemoryUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, limit])

  return {
    totalMemoryCount: query.data?.totalMemoryCount ?? 0,
    topSubjects: query.data?.topSubjects ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
  }
}
