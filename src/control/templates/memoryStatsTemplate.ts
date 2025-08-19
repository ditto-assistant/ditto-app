import { Subject } from "@/types/common"
import type { MemoryStatsParams } from "../../api/memoryStats"

export const generateMemoryStatsSection = (
  params: MemoryStatsParams
): string => {
  const { totalMemoryCount, topSubjects } = params

  // Don't show the module if user has 0 memories
  if (totalMemoryCount === 0) {
    return ""
  }

  let section = `## Memory Stats Module

You have access to ${totalMemoryCount} conversation memories that capture your interactions with ${params.totalMemoryCount > 1 ? "the user" : "this user"}.`

  // Add top subjects section if we have subjects
  if (topSubjects.length > 0) {
    section += `\n\n### Top Memory Subjects\nHere are the main topics you've discussed together, ordered by frequency:\n`

    topSubjects.forEach((subject, index) => {
      const subjectLine = `${index + 1}. **${subject.subject_text}** (${subject.pair_count} conversation${subject.pair_count === 1 ? "" : "s"})`

      // Add description if available
      if (subject.description && subject.description.trim()) {
        section += `\n${subjectLine}\n   - ${subject.description}`
      } else {
        section += `\n${subjectLine}`
      }
    })
  }

  section += `\n\nThese memory statistics help you understand the user's interests and conversation patterns.`

  return section
}
