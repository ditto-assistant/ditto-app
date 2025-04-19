import { TOOLS } from "../../constants"
import type { Tool, ToolPreferences } from "../../types/llm"
import type { ScriptType, SelectedScriptInfo } from "../../hooks/useScripts"
const getToolsModule = (params: {
  scriptType?: ScriptType
  toolPreferences: ToolPreferences
}): Tool[] => {
  const { scriptType, toolPreferences } = params

  // Filter tools based on preferences
  const enabledTools = TOOLS.filter(
    (tool) => toolPreferences[tool.id as keyof ToolPreferences]
  )

  if (!scriptType) return enabledTools

  const scriptTypeLower = scriptType.toLowerCase()

  // Find the tool specific to the script type (currently only webApps)
  let scriptSpecificToolId: keyof ToolPreferences | null = null
  if (scriptTypeLower === "webapps") {
    scriptSpecificToolId = "htmlScript"
  }
  // Add other script-specific tool lookups here if needed in the future

  if (scriptSpecificToolId && toolPreferences[scriptSpecificToolId]) {
    // Find the tool object using the ID
    const scriptSpecificTool = TOOLS.find(
      (tool) => tool.id === scriptSpecificToolId
    )

    if (scriptSpecificTool) {
      // If the script-specific tool is enabled and found,
      // move it to the beginning of the array.
      const index = enabledTools.findIndex((t) => t.id === scriptSpecificToolId)
      if (index > -1) {
        const [toolToMove] = enabledTools.splice(index, 1)
        // Ensure the return type matches Tool[]
        return [toolToMove, ...enabledTools] as Tool[]
      } else {
        // If it wasn't found in enabledTools but should be enabled, add it to the front.
        // This should ideally not happen if TOOLS and ToolPreferences are consistent.
        return [scriptSpecificTool, ...enabledTools] as Tool[]
      }
    }
  }

  // Ensure the return type matches Tool[]
  return enabledTools as Tool[]
}

export const systemTemplate = () => {
  return "You are a friendly AI named Ditto here to help the user who is your best friend."
}

/**
 * This function returns the current time in the timezone of the user.
 * @returns {string} timezoneString - The current time in the timezone of the user.
 */
export const getTimezoneString = () => {
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

export const workingOnScriptModule = (params: {
  scriptName?: string
  type?: ScriptType
}) => {
  const { scriptName, type } = params
  if (!scriptName) {
    return ""
  }
  return `## Current Script: ${scriptName}
- If you are reading this, that means the user is currently working on a ${type} script. Please send any requests from the user to the respective agent/tool for the user's ${type} script.
- Don't send a user's prompt to the tool if they are obviously asking you something off topic to the current script or chatting with you. 
`
}

export const mainTemplate = (params: {
  memories: string
  examples: string
  firstName: string
  timestamp: string
  usersPrompt: string
  selectedScript?: SelectedScriptInfo
  toolPreferences: ToolPreferences
}) => {
  const {
    memories,
    examples,
    firstName,
    timestamp,
    usersPrompt,
    selectedScript,
    toolPreferences,
  } = params
  console.log("toolPreferences", params)
  const tools = getToolsModule({
    scriptType: selectedScript?.scriptType,
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

<!working_on_script_module>

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
  prompt = prompt.replace(
    "<!working_on_script_module>",
    workingOnScriptModule({
      scriptName: selectedScript?.script,
      type: selectedScript?.scriptType,
    })
  )
  prompt = prompt.replace("<!users_name>", firstName)
  prompt = prompt.replace("<!timestamp>", timestamp)
  prompt = prompt.replace("<!users_prompt>", usersPrompt)
  return prompt
}
