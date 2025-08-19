import { MemoryStats } from "@/hooks/useMemoryStats"

/**
 * Creates a memory stats section for the system prompt
 * @param memoryStats - The memory statistics object
 * @returns Formatted memory stats string
 */
export function createMemoryStatsPrompt(memoryStats: MemoryStats): string {
  if (!memoryStats || memoryStats.loading || memoryStats.error) {
    return ""
  }

  const { totalMemoryCount, topSubjects } = memoryStats

  // Build the memory stats section
  let prompt = `\n\n## USER MEMORY CONTEXT\n`
  prompt += `Total Conversations: ${totalMemoryCount}\n`

  if (topSubjects && topSubjects.length > 0) {
    prompt += `\nTop Conversation Subjects:\n`
    topSubjects.forEach((subject, index) => {
      const description = subject.description ? ` - ${subject.description}` : ""
      prompt += `${index + 1}. ${subject.subject_text} (${subject.pair_count} conversations)${description}\n`
    })
  }

  prompt += `\nThis context helps you understand the user's interests and conversation patterns. Use this information to provide more relevant and personalized responses.`

  return prompt
}
