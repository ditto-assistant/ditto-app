import { TOOLS } from "../../constants"
import type { Tool, ToolPreferences } from "../../types/llm"
import { PersonalityStorage } from "../../utils/personalityStorage"
import { generateMemoryStatsSection } from "./memoryStatsTemplate"
import type { MemoryStatsParams } from "../../api/memoryStats"

const getToolsModule = (params: {
  toolPreferences: ToolPreferences
}): Tool[] => {
  const { toolPreferences } = params

  // Filter tools based on preferences
  const enabledTools = TOOLS.filter(
    (tool) => toolPreferences[tool.id as keyof ToolPreferences]
  )

  return enabledTools as Tool[]
}

const getTimezoneString = (): string => {
  let timezoneString
  let timezone = new Date()
    .toLocaleString("en-US", { timeZoneName: "short" })
    .split(" ")
  if (timezone[1] === "Standard") {
    timezoneString = timezone[2]
  } else {
    timezoneString = timezone[1]
  }
  return timezoneString
}

export const systemTemplate = (params: {
  userID?: string
  memories: string
  examples: string
  firstName: string
  timestamp: string
  toolPreferences: ToolPreferences
  memoryStats?: MemoryStatsParams
}) => {
  const {
    userID,
    memories,
    examples,
    firstName,
    timestamp,
    toolPreferences,
    memoryStats,
  } = params

  let baseSystem =
    "You are a friendly AI named Ditto here to help the user who is your best friend."

  if (userID) {
    // Get personality information from localStorage
    const personalitySummary = PersonalityStorage.getPersonalitySummary(userID)
    if (personalitySummary) {
      if (import.meta.env.DEV) {
        console.log("🧠 SystemTemplate: Found personality summary for user.")
      }
      baseSystem += `\n\n## User's Personality Profile:\n${personalitySummary}\n\nUse this personality information to better understand and respond to the user's communication style and preferences.`
    }
  }

  const tools = getToolsModule({ toolPreferences })

  const toolsSection =
    tools.length > 0
      ? `\n\n## Available Tools\n${tools
          .map(
            (tool, index) =>
              `${index + 1}. ${tool.name}: ${tool.description} (Trigger: ${tool.trigger})`
          )
          .join("\n")}`
      : ""

  const filteredExamples = examples
    .split("\n\n")
    .filter((example) => {
      if (!example.trim()) return false

      return tools.some((tool) => {
        const triggerBase = tool.trigger.split(" ")[0]
        return example.includes(triggerBase)
      })
    })
    .map((example, index) => {
      const cleanExample = example
        .replace(/Example \d+\s*Example \d+/g, "")
        .replace(/Example \d+/g, "")
        .trim()

      const [_, response] = cleanExample
        .split("User's Prompt:")
        .map((s) => s.trim())

      return `Example ${index + 1}\nUser's Prompt: ${response}`
    })
    .join("\n\n")

  const examplesSection =
    tools.length > 0 && filteredExamples
      ? `\n\n## Examples of User Prompts that need tools:\n-- Begin Examples --\n${filteredExamples}\n-- End Examples --`
      : ""

  const currentTime =
    getTimezoneString() + " " + (new Date().getHours() >= 12 ? "PM" : "AM")

  // Generate memory stats section if data is available
  const memoryStatsSection = memoryStats
    ? `\n\n${generateMemoryStatsSection(memoryStats)}`
    : ""

  const systemPrompt = `${baseSystem}

${toolsSection}${examplesSection}${memoryStatsSection}

## Context Information
- User's Name: ${firstName}
- Current Timestamp: ${timestamp}
- Current Time in User's Timezone: ${currentTime}

## Memory Context
${memories}

You are having a conversation with ${firstName}. Respond naturally and helpfully as their AI best friend, Ditto.`

  return systemPrompt
}

export const userMessageTemplate = (userPrompt: string) => {
  // Basic input validation to prevent prompt injection
  if (!userPrompt || typeof userPrompt !== "string") {
    return ""
  }

  // Trim and limit length to prevent excessive input (~50k tokens worth)
  const sanitized = userPrompt.trim().slice(0, 200000)

  return sanitized
}
