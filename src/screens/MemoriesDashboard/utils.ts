import { Memory } from "@/api/getMemories"
import type { Subject, Pair } from "@/types/common"

// Utility function to format numbers with abbreviations
export const formatCount = (count: number) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M"
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  } else {
    return count.toString()
  }
}

// Utility function to deduplicate subjects by ID
export const deduplicateSubjects = (
  existingSubjects: Subject[],
  newSubjects: Subject[]
): Subject[] => {
  const existingIds = new Set(existingSubjects.map((s) => s.id))
  const uniqueNewSubjects = newSubjects.filter((s) => !existingIds.has(s.id))
  return [...existingSubjects, ...uniqueNewSubjects]
}

// Utility function to deduplicate pairs by ID
export const deduplicatePairs = (existingPairs: Pair[], newPairs: Pair[]): Pair[] => {
  const existingIds = new Set(existingPairs.map((p) => p.id))
  const uniqueNewPairs = newPairs.filter((p) => !existingIds.has(p.id))
  return [...existingPairs, ...uniqueNewPairs]
}

// Helper function to flatten memories for the list view
export const flattenMemoriesForList = (
  memoryList: Memory[]
): (Memory & { level: number })[] => {
  let flatList: (Memory & { level: number })[] = []
  const dive = (mems: Memory[], level: number) => {
    // First sort the memories at this level by vector_distance (lower is better, so reverse to get best first)
    const sortedMems = [...mems].sort(
      (a, b) => b.vector_distance - a.vector_distance
    )

    for (const mem of sortedMems) {
      flatList.push({ ...mem, children: undefined, level })
      if (mem.children && mem.children.length > 0) {
        dive(mem.children, level + 1)
      }
    }
  }
  dive(memoryList, 1)
  return flatList
}