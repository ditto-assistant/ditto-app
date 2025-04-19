import { saveScriptToFirestore } from "../firebase"
import { promptLLMV2 } from "../../api/LLM"
import updaterAgent from "../agentflows/updaterAgentFlow"
import {
  scriptToNameTemplate,
  scriptToNameSystemTemplate
} from "../templates/scriptToNameTemplate"

/**
 * Handles script generation flow (OpenSCAD or HTML)
 * @typedef {import("../../types/llm").ModelPreferences} ModelPreferences
 * @param {Object} params - The parameters for script generation.
 * @param {string} params.response - The user's response to the script generation prompt.
 * @param {string} params.tag - The tag used to identify the script generation prompt.
 * @param {function} params.templateFunction - The function that constructs the script generation prompt.
 * @param {function} params.systemTemplateFunction - The function that constructs the system prompt for the script generation.
 * @param {function} params.downloadFunction - The function that downloads the generated script.
 * @param {string} params.scriptType - The type of script to generate.
 * @param {string} params.scriptContents - The contents of the script to generate.
 * @param {string} params.scriptName - The name of the script to generate.
 * @param {Array} params.memories - The memories of the user.
 * @param {Object} params.updateConversation - The function to update the conversation.
 * @param {ModelPreferences} params.preferences - The preferences of the user.
 */
export const handleScriptGeneration = async ({
  response,
  tag,
  templateFunction,
  systemTemplateFunction,
  downloadFunction,
  scriptType,
  scriptContents,
  scriptName,
  prompt,
  userID,
  image,
  memories,
  preferences
}) => {
  const query = response.split(tag)[1]
  const constructedPrompt = templateFunction(
    query,
    scriptContents,
    memories.longTermMemory,
    memories.shortTermMemory
  )

  console.log("%c" + constructedPrompt, "color: green")

  let scriptResponse = ""

  if (!scriptContents) {
    scriptResponse = await promptLLMV2(
      constructedPrompt,
      systemTemplateFunction(),
      preferences.programmerModel,
      image
    )
    console.log("%c" + scriptResponse, "color: yellow")
  } else {
    scriptResponse = await updaterAgent(
      prompt,
      scriptContents,
      preferences.programmerModel
    )
    console.log("%c" + scriptResponse, "color: yellow")
  }

  const cleanedScript = cleanScriptResponse(scriptResponse)
  if (!scriptName) {
    scriptName = await generateScriptName(cleanedScript, query)
  }

  const fileName = downloadFunction(cleanedScript, scriptName)
  let fileNameNoExt = fileName.substring(0, fileName.lastIndexOf("."))
  await saveScriptToFirestore(userID, cleanedScript, scriptType, fileNameNoExt)
  return `**${scriptType === "webApps" ? "HTML" : "OpenSCAD"} Script Generated and Downloaded.**\n- Task: ${query}`
}

/**
 * Generates a name for the script based on its contents and query
 */
export const generateScriptName = async (script, query) => {
  const scriptToNameConstructedPrompt = scriptToNameTemplate(script, query)
  console.log("%c" + scriptToNameConstructedPrompt, "color: green")

  let scriptToNameResponse = await promptLLMV2(
    scriptToNameConstructedPrompt,
    scriptToNameSystemTemplate(),
    "mistral-nemo"
  )

  // Handle errors and retries
  if (scriptToNameResponse.includes("error sending request")) {
    console.log("API error detected, retrying script name generation...")
    scriptToNameResponse = await promptLLMV2(
      scriptToNameConstructedPrompt,
      scriptToNameSystemTemplate(),
      "mistral-nemo"
    )
    if (scriptToNameResponse.includes("error sending request")) {
      console.log("Second attempt failed, defaulting to 'App Name Here'")
      return "App Name Here"
    }
  }

  if (scriptToNameResponse.includes("user balance is:")) {
    alert("Please add more Tokens in Settings to continue using this app.")
    return "App Name Here"
  }

  console.log("%c" + scriptToNameResponse, "color: yellow")
  return scriptToNameResponse.trim().replace("Script Name:", "").trim()
}

/**
 * Cleans up script response by removing markdown and extra whitespace
 */
const cleanScriptResponse = (response) => {
  let cleanedScript = response
  if (cleanedScript.includes("```")) {
    cleanedScript = cleanedScript.split("```")[1]
  }
  if (cleanedScript.includes("\n")) {
    cleanedScript = cleanedScript.split("\n").slice(1).join("\n")
  }
  if (cleanedScript.includes("```")) {
    cleanedScript = cleanedScript.split("```")[0]
  }
  return cleanedScript
}
