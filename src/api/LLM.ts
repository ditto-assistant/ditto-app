import { ErrorPaymentRequired } from "@/types/errors"
import { routes } from "@/firebaseConfig"
import { getToken } from "@/api/auth"
import { getUserLocalTime } from "@/lib/time"
import { getDeviceID } from "@/lib/deviceId"
import { fetchEventSource } from "@/lib/fetch-event-source"

type TextCallback = (text: string) => void

// Prompt V2 content payload to mirror backend types.Content minimally
type PromptV2ContentType =
  | "text"
  | "image"
  | "application/pdf"
  | "audio/wav"
  | "audio/mp3"

export interface PromptV2Content {
  type: PromptV2ContentType
  content: string
}

// Tool call information for streaming
export interface ToolCallInfo {
  id: string
  name: string
  args: Record<string, unknown>
}

// Cancel an active prompt streaming request
export async function cancelPromptLLMV2(): Promise<boolean> {
  try {
    const tok = await getToken()
    if (tok.err) throw tok.err
    if (!tok.ok) throw new Error("Unable to get token")

    const response = await fetch(routes.promptStop(tok.ok.userID), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.ok.token}`,
      },
    })

    if (response.status === 404) {
      console.log("🛑 [LLM] No active stream to cancel")
      return false
    }

    if (!response.ok) {
      throw new Error(
        `Failed to cancel prompt: ${response.status} ${response.statusText}`
      )
    }

    console.log("🛑 [LLM] Prompt stream cancelled successfully")
    return true
  } catch (error) {
    console.error("🛑 [LLM] Error cancelling prompt:", error)
    return false
  }
}

// New simplified V2 caller that builds and sends `input` array (types.Content shape)
export async function promptV2BackendBuild(opts: {
  input: PromptV2Content[]
  textCallback?: TextCallback | null
  onPairID?: (pairID: string) => void
  onImagePartial?: (index: number, b64: string) => void
  onImageCompleted?: (url: string) => void
  onToolCalls?: (toolCalls: ToolCallInfo[]) => void
  personalitySummary: string
  memoryStats?: string
}): Promise<string> {
  const deviceID = getDeviceID()
  const userLocalTime = getUserLocalTime()

  // Use array for efficient string building instead of concatenation
  const responseChunks: string[] = []
  const tok = await getToken()
  if (tok.err) throw tok.err
  if (!tok.ok) throw new Error("Unable to get token")

  try {
    const body = {
      userID: tok.ok.userID,
      input: opts.input,
      personalitySummary: opts.personalitySummary,
      userLocalTime,
      deviceID,
      memoryStats: opts.memoryStats ?? "",
    }

    await fetchEventSource(routes.promptV2, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tok.ok.token}`,
      },
      body: JSON.stringify(body),
      onopen: async (response) => {
        if (response.status === 402) throw ErrorPaymentRequired
        if (!response.ok)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      },
      onmessage: (message) => {
        try {
          const eventData = JSON.parse(message.data)

          // Handle all SSE events based on the event type
          switch (message.event) {
            case "chat.content":
              // Backend sends: EventContent{Data: delta} -> {"data": "text content"}
              const content = String(eventData?.data || "")
              if (opts.textCallback) opts.textCallback(content)
              responseChunks.push(content)
              break

            case "pair.created":
              // Backend sends: EventContent{ID: pairID} -> {"id": "pair-id"}
              const pairId: string = String(eventData?.id || "")
              if (pairId && opts.onPairID) opts.onPairID(pairId)
              break

            case "image.partial":
              // Backend sends: EventContent{Data: {"index": 0, "b64": "..."}} -> {"data": {"index": 0, "b64": "..."}}
              const idx = Number(eventData?.data?.index ?? 0)
              const b64 = String(eventData?.data?.b64 || "")
              if (!Number.isNaN(idx) && b64) opts.onImagePartial?.(idx, b64)
              break

            case "image.completed":
              // Backend sends: EventContent{Data: {"url": "..."}} -> {"data": {"url": "..."}}
              const url = String(eventData?.data?.url || "")
              if (url) opts.onImageCompleted?.(url)
              break

            case "tool.calls":
              // Backend sends: EventContent{Data: [ToolCallInfo]} -> {"data": [{"id": "...", "name": "...", "args": {...}}]}
              const toolCalls: ToolCallInfo[] = Array.isArray(eventData?.data)
                ? eventData.data
                : []
              if (toolCalls.length > 0) opts.onToolCalls?.(toolCalls)
              break

            case "error":
              // Backend sends: EventContent{Message: msg} -> {"message": "error message"}
              const msg: string = String(eventData?.message || message.data)
              throw new Error(msg)

            default:
              console.warn("Unknown event: ", message.event)
              break
          }
        } catch (e) {
          console.error("Error parsing SSE event:", e, message.data)
        }
      },
      onerror: (error) => {
        if (
          (error instanceof Error && error.message?.includes("402")) ||
          (error instanceof Error &&
            error.message?.includes("Payment Required"))
        ) {
          throw ErrorPaymentRequired
        }
        throw error
      },
    })

    // If we get here, the streaming completed successfully
    return responseChunks.join("")
  } catch (error) {
    if (
      (error instanceof Error && error.message?.includes("402")) ||
      (error instanceof Error && error.message?.includes("Payment Required"))
    ) {
      throw ErrorPaymentRequired
    }
    throw error
  }
}
