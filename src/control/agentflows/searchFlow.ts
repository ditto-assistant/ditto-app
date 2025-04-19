import { webSearch } from "../../api/webSearch"
import { promptLLMV2 } from "../../api/LLM"
import {
  googleSearchTemplate,
  googleSearchSystemTemplate
} from "../templates/googleSearchTemplate"
import { ModelPreferences } from "@/types/llm"

/**
 * Handles Google search flow
 */
export const handleGoogleSearch = async (
  response: string,
  prompt: string,
  preferences: ModelPreferences,
  streamingCallback: ((text: string) => void) | null = null
) => {
  // Get the entire content after <GOOGLE_SEARCH> tag
  const afterTag = response.split("<GOOGLE_SEARCH>")[1]

  // Extract the query (first line) and any additional text
  const firstLineBreak = afterTag.indexOf("\n")
  const query =
    firstLineBreak > -1
      ? afterTag.substring(0, firstLineBreak).trim()
      : afterTag.trim()

  // Get any additional content after the query (agent's comments, etc.)
  const additionalContent =
    firstLineBreak > -1 ? afterTag.substring(firstLineBreak) : ""

  // Perform the search
  const { ok, err } = await webSearch(query)
  if (err) {
    return { err }
  }

  let searchResults = "Google Search Query: " + query + "\n" + ok
  const googleSearchAgentTemplate = googleSearchTemplate(prompt, searchResults)

  console.log("%c" + googleSearchAgentTemplate, "color: green")

  // Prepare the prefix with the query and any additional content from first agent
  const prefix = "Google Search Query: " + query + additionalContent + "\n\n"
  let finalResponse = prefix

  // Stream the Google Search agent's response using the same mechanism
  // as the main agent responses
  await promptLLMV2(
    googleSearchAgentTemplate,
    googleSearchSystemTemplate(),
    preferences.mainModel,
    "", // No image
    (text) => {
      // Append each chunk to the final response
      finalResponse += text

      // Also forward to the external streaming callback if provided
      if (streamingCallback) {
        streamingCallback(text)
      }
    }
  )

  console.log("%c" + finalResponse, "color: yellow")
  return finalResponse
}
