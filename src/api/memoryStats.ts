import { getTopSubjects } from "@/api/kg"
import { getConversationCount } from "@/api/userContent"
import { Subject } from "@/types/common"

export interface MemoryStatsParams {
  totalMemoryCount: number
  topSubjects: Subject[]
}

/**
 * Fetches memory stats for a user synchronously
 * @param userID - The user ID
 * @param limit - Number of top subjects to fetch (default: 5)
 * @returns Promise<MemoryStatsParams | null> - Returns null if there's an error or no memories
 */
export async function fetchMemoryStats(
  userID: string,
  limit: number = 5
): Promise<MemoryStatsParams | null> {
  try {
    // Fetch both total memory count and top subjects in parallel
    const [memoryCountResult, topSubjectsResult] = await Promise.all([
      getConversationCount(userID),
      getTopSubjects({ userID, limit }),
    ])

    // Handle memory count result
    if (memoryCountResult instanceof Error) {
      console.warn("Failed to fetch memory count:", memoryCountResult.message)
      return null
    }

    const totalMemoryCount = memoryCountResult.count

    // If user has 0 memories, return null (don't show module)
    if (totalMemoryCount === 0) {
      return null
    }

    // Handle top subjects result
    let topSubjects: Subject[] = []
    if (topSubjectsResult.err) {
      console.warn("Failed to fetch top subjects:", topSubjectsResult.err)
      // Continue with empty subjects rather than failing entirely
    } else if (topSubjectsResult.ok) {
      topSubjects = topSubjectsResult.ok.results
    }

    return {
      totalMemoryCount,
      topSubjects,
    }
  } catch (error) {
    console.error("Error fetching memory stats:", error)
    return null
  }
}
