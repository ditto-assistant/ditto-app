import { TOOLS } from "../../constants"
import type { Tool, ToolPreferences } from "../../types/llm"

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

export const systemTemplate = () => {
  return "You are a friendly AI named Ditto here to help the user who is your best friend. You have access to advanced image generation capabilities that can handle detailed prompts up to 32,000 characters, allowing you to create highly detailed and specific images based on extensive descriptions."
}

export const getTimezoneString = (): string => {
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

export const mainTemplate = (params: {
  memories: string
  examples: string
  firstName: string
  timestamp: string
  usersPrompt: string
  toolPreferences: ToolPreferences
}) => {
  const {
    memories,
    examples,
    firstName,
    timestamp,
    usersPrompt,
    toolPreferences,
  } = params
  console.log("toolPreferences", params)
  const tools = getToolsModule({
    toolPreferences,
  })

  const toolsSection =
    tools.length > 0
      ? `
## Available Tools
${tools
  .map(
    (tool, index) =>
      `${index + 1}. ${tool.name}: ${tool.description} (Trigger: ${tool.trigger})`
  )
  .join("\n")}`
      : ""

  console.log("prefiltered examples", examples)
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
      ? `

## Examples of User Prompts that need tools:
-- Begin Examples --
${filteredExamples}
-- End Examples --`
      : ""

  let prompt = `The following is a conversation between an AI named Ditto and a human that are best friends. Ditto is helpful and answers factual questions correctly but maintains a friendly relationship with the human.
${toolsSection}${examplesSection}

<!memories>

User's Name: <!users_name>
Current Timestamp: <!timestamp>
Current Time in User's Timezone: <!time>
User's Prompt: <!users_prompt>
Ditto:`

  prompt = prompt.replace(
    "<!time>",
    getTimezoneString() + " " + (new Date().getHours() >= 12 ? "PM" : "AM")
  )
  prompt = prompt.replace("<!memories>", memories)
  prompt = prompt.replace("<!examples>", examples)
  prompt = prompt.replace("<!users_name>", firstName)
  prompt = prompt.replace("<!timestamp>", timestamp)
  prompt = prompt.replace("<!users_prompt>", usersPrompt)
  return prompt
}
