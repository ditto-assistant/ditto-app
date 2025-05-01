import { ErrorPaymentRequired } from "@/types/errors"
import { DEFAULT_PREFERENCES } from "../constants"
import { routes } from "../firebaseConfig"
import { getToken } from "./auth"

type Model = string // This should match the type from "../constants"
type TextCallback = (text: string) => void

interface ImageGenerationPreferences {
  model: string
  size: {
    wh: string
  }
}

interface PromptRequestBody {
  userID: string
  userPrompt: string
  systemPrompt: string
  model: Model
  imageURL: string
}

// SSE event types for v2 prompt endpoint
interface SSETextEvent {
  type: "text"
  data: string
}

interface SSEErrorEvent {
  type: "error"
  data: string
}

interface SSEDoneEvent {
  type: "done"
}

type SSEEvent = SSETextEvent | SSEErrorEvent | SSEDoneEvent

export async function promptLLM(
  userPrompt: string,
  systemPrompt: string,
  model: Model = "gemini-1.5-flash",
  imageURL: string = "",
  textCallback: TextCallback | null = null
): Promise<string> {
  console.log("Sending prompt to LLM: ", model)
  let responseMessage = ""
  let retries = 0
  const maxRetries = 3
  const tok = await getToken()
  if (tok.err) {
    console.error(tok.err)
    return "Error: Unable to get LLM response"
  }
  if (!tok.ok) {
    return "Error: Unable to get LLM response"
  }
  while (retries < maxRetries) {
    try {
      const requestBody: PromptRequestBody = {
        userID: tok.ok.userID,
        userPrompt,
        systemPrompt,
        model,
        imageURL,
      }
      const response = await fetch(routes.prompt, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify(requestBody),
      })

      // Check for payment required error
      if (response.status === 402) {
        return "Error: Payment Required. Please check your token balance."
      }

      // Handle other error statuses
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Handle the response stream
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Process the response as a whole for now
        if (textCallback) {
          textCallback(chunk)
        }

        responseMessage += chunk
      }

      console.log(
        `✅ [LLM] Completed streaming, total length: ${responseMessage.length} chars`
      )
      return responseMessage
    } catch (error) {
      console.error("Error in promptLLM:", error)
      retries++
      console.log("Retry: ", retries)

      // If it's a payment error, return immediately
      if (
        (error instanceof Error && error.message?.includes("402")) ||
        (error instanceof Error && error.message?.includes("Payment Required"))
      ) {
        return "Error: Payment Required. Please check your token balance."
      }
    }
  }
  console.error("Error in promptLLM: Max retries reached.")
  return "An error occurred. Please try again."
}

export async function openaiImageGeneration(
  prompt: string,
  preferences: ImageGenerationPreferences = DEFAULT_PREFERENCES.imageGeneration
): Promise<string | Error> {
  const tok = await getToken()
  if (tok.err) {
    return tok.err
  }
  if (!tok.ok) {
    return new Error("Unable to get image generation")
  }
  const response = await fetch(routes.imageGeneration, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tok.ok.token}`,
    },
    body: JSON.stringify({
      userID: tok.ok.userID,
      prompt,
      model: preferences.model,
      size: preferences.size.wh,
    }),
  })
  if (response.status === 402) {
    return ErrorPaymentRequired
  }
  if (!response.ok) {
    return new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return await response.text()
}

// For request cancellation
let abortController: AbortController | null = null;

export function cancelPromptLLMV2() {
  if (abortController) {
    console.log("🛑 [LLM] Cancelling prompt request")
    abortController.abort()
    abortController = null
    return true
  }
  return false
}

export async function promptLLMV2(
  userPrompt: string,
  systemPrompt: string,
  model: Model = "gemini-1.5-flash",
  imageURL: string = "",
  textCallback: TextCallback | null = null
): Promise<string> {
  console.log("Sending prompt to LLM V2: ", model)
  let responseMessage = ""
  let retries = 0
  const maxRetries = 3
  const tok = await getToken()
  if (tok.err) {
    throw tok.err
  }
  if (!tok.ok) {
    throw new Error("Unable to get LLM response")
  }

  // Create a new AbortController for this request
  abortController = new AbortController()
  const signal = abortController.signal

  while (retries < maxRetries) {
    try {
      const requestBody: PromptRequestBody = {
        userID: tok.ok.userID,
        userPrompt,
        systemPrompt,
        model,
        imageURL,
      }

      const response = await fetch(routes.promptV2, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.ok.token}`,
        },
        body: JSON.stringify(requestBody),
        signal, // Add the abort signal to the fetch request
      })

      if (response.status === 402) {
        throw ErrorPaymentRequired
      }

      // Handle other error statuses
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Create an EventSource from the response
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      // Read and process the SSE stream
      while (true) {
        // Check if we've been aborted
        if (signal.aborted) {
          console.log("🛑 [LLM] Request was aborted during streaming")
          throw new Error("Request cancelled")
        }

        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Process the SSE events
        const eventStrings = chunk.split("\n\n").filter(Boolean)

        for (const eventString of eventStrings) {
          if (!eventString.startsWith("data: ")) continue

          try {
            const eventData = JSON.parse(eventString.substring(6))
            const event = eventData as SSEEvent

            switch (event.type) {
              case "text":
                if (textCallback) {
                  textCallback(event.data)
                }
                responseMessage += event.data
                break
              case "error":
                console.error("Error from SSE stream:", event.data)
                throw new Error(event.data)
              case "done":
                console.log("✅ [LLM] Completed SSE streaming")
                break
            }
          } catch (error) {
            console.error("Error parsing SSE event:", error, eventString)
          }
        }
      }

      console.log(
        `✅ [LLM V2] Completed streaming, total length: ${responseMessage.length} chars`
      )
      // Clear the abortController since the request is complete
      abortController = null
      return responseMessage
    } catch (error) {
      // Check if this was an abort error
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request was aborted by user")
        abortController = null
        throw new Error("Request cancelled")
      }

      console.error("Error in promptLLMV2:", error)
      retries++
      console.log("Retry: ", retries)

      // If it's a payment error, return immediately
      if (
        (error instanceof Error && error.message?.includes("402")) ||
        (error instanceof Error && error.message?.includes("Payment Required"))
      ) {
        abortController = null
        throw ErrorPaymentRequired
      }
    }
  }
  abortController = null
  throw new Error("promptLLMV2: Max retries reached.")
}
