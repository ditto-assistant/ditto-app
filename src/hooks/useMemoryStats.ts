import { useAuth } from "./useAuth"
import { getTopSubjects } from "@/api/kg"
import { Subject } from "@/types/common"
import { useQuery } from "@tanstack/react-query"

export interface MemoryStats {
  topSubjects: Subject[]
  loading: boolean
  error: string | null
}

export function useMemoryStats(limit: number = 15): MemoryStats {
  const { user } = useAuth()

  const query = useQuery<{ topSubjects: Subject[] }, Error>({
    queryKey: ["memory-stats", user?.uid, limit],
    enabled: !!user?.uid,
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!user?.uid) {
        return { topSubjects: [] }
      }

      const topSubjectsResult = await getTopSubjects({
        userID: user.uid,
        limit,
      })

      let topSubjects: Subject[] = []
      if (topSubjectsResult.err) {
        // Don't fail the whole query if subjects fail; log and continue
        console.warn("Failed to fetch top subjects:", topSubjectsResult.err)
      } else if (topSubjectsResult.ok) {
        topSubjects = topSubjectsResult.ok.results
      }

      return {
        topSubjects,
      }
    },
  })

  return {
    topSubjects: query.data?.topSubjects ?? [],
    loading: query.isLoading,
    error: query.error ? query.error.message : null,
  }
}

/**
 * Converts top subjects array to a formatted string for AI prompts.
 * Only formats the subjects list, all header content is handled in the backend template.
 *
 * @param topSubjects - Array of top subjects
 * @returns Formatted string of top subjects or empty string if none
 */
export const stringifyTopSubjects = (topSubjects: Subject[]): string => {
  if (topSubjects.length === 0) {
    return ""
  }

  let section = ""

  topSubjects.forEach((subject, index) => {
    const subjectLine = `${index + 1}. **${subject.subject_text}** (${subject.pair_count} conversation${subject.pair_count === 1 ? "" : "s"})`

    // Add description if available
    if (subject.description && subject.description.trim()) {
      section += `\n${subjectLine}\n   - ${subject.description}`
    } else {
      section += `\n${subjectLine}`
    }
  })

  return section
}
