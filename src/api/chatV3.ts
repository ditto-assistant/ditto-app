import { z } from "zod"
import { auth } from "@/lib/firebase"
import { BASE_URL } from "@/firebaseConfig"

// Zod schemas for type validation
export const ContentV3Schema = z.object({
  type: z.enum(["text", "image"]),
  text: z.string().optional(),
  imageURL: z.string().optional(),
})

export const ChatV3RequestSchema = z.object({
  deviceID: z.string(),
  input: z.array(ContentV3Schema),
  deepSearchMemories: z.boolean(),
  userLocalTime: z.string(),
  sessionID: z.string().optional(),
})

export const ChatSessionV3Schema = z.object({
  id: z.string(),
  userID: z.string().optional(),
  title: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.any()).optional(),
})

export const ListSessionsV3ResponseSchema = z.object({
  items: z.array(ChatSessionV3Schema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalCount: z.number(),
    totalPages: z.number(),
  }),
})

export const UpdateSessionV3RequestSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const SSEEventSchema = z.object({
  type: z.string(),
  content: z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    message: z.string().optional(),
    data: z.any().optional(),
  }),
})

// TypeScript types derived from Zod schemas
export type ContentV3 = z.infer<typeof ContentV3Schema>
export type ChatV3Request = z.infer<typeof ChatV3RequestSchema>
export type ChatSessionV3 = z.infer<typeof ChatSessionV3Schema>
export type ListSessionsV3Response = z.infer<
  typeof ListSessionsV3ResponseSchema
>
export type UpdateSessionV3Request = z.infer<
  typeof UpdateSessionV3RequestSchema
>
export type SSEEvent = z.infer<typeof SSEEventSchema>

export type SSEEventHandler = (event: SSEEvent) => void
export type SSEContentHandler = (content: string) => void
export type SSEErrorHandler = (error: string) => void
export type SSEToolCallHandler = (toolCalls: unknown[]) => void
export type SSEToolResultHandler = (toolResults: unknown[]) => void
export type SSESessionCreatedHandler = (sessionID: string) => void

/**
 * Start a chat conversation using the V3 API with SSE streaming
 */
export async function chatV3(
  userID: string,
  request: ChatV3Request,
  onContent: SSEContentHandler,
  onProgress: (message: string) => void,
  onError: SSEErrorHandler,
  signal?: AbortSignal,
  onToolCalls?: SSEToolCallHandler,
  onToolResults?: SSEToolResultHandler,
  onSessionCreated?: SSESessionCreatedHandler
): Promise<void> {
  // Validate request with Zod
  const validatedRequest = ChatV3RequestSchema.parse(request)

  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const response = await fetch(`${BASE_URL}/api/v3/users/${userID}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(validatedRequest),
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Response body is not readable")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let currentEventType = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEventType = line.slice(7).trim()
          continue
        }

        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim()
          if (!data) continue

          try {
            if (currentEventType === "chat.content") {
              // For chat content, the data is just the text chunk
              onContent(data)
            } else {
              // For other events, parse as JSON and validate
              const eventContent = JSON.parse(data)
              const event = SSEEventSchema.parse({
                type: currentEventType || "unknown",
                content: eventContent,
              })

              switch (event.type) {
                case "progress":
                  onProgress(event.content.message || "")
                  break
                case "error":
                  onError(event.content.message || "Unknown error")
                  return
                case "done":
                  return
                case "session.created":
                  if (onSessionCreated && event.content.id) {
                    onSessionCreated(event.content.id)
                  }
                  break
                case "tool.calls":
                  if (onToolCalls && Array.isArray(event.content.data)) {
                    onToolCalls(event.content.data)
                  }
                  break
                case "tool.results":
                  if (onToolResults && Array.isArray(event.content.data)) {
                    onToolResults(event.content.data)
                  }
                  break
                default:
                  console.log("Unknown SSE event:", event)
              }
            }
          } catch (e) {
            console.error("Failed to parse SSE event:", e, "Data:", data)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * List chat sessions for a user
 */
export async function listSessionsV3(
  userID: string,
  options: {
    status?: string
    page?: number
    pageSize?: number
  } = {}
): Promise<ListSessionsV3Response> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const params = new URLSearchParams()
  if (options.status) params.append("status", options.status)
  if (options.page) params.append("page", options.page.toString())
  if (options.pageSize) params.append("pageSize", options.pageSize.toString())

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/sessions?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return ListSessionsV3ResponseSchema.parse(data)
}

/**
 * Get a specific chat session
 */
export async function getSessionV3(
  userID: string,
  sessionID: string
): Promise<ChatSessionV3> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/sessions/${sessionID}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return ChatSessionV3Schema.parse(data)
}

/**
 * Update a chat session
 */
export async function updateSessionV3(
  userID: string,
  sessionID: string,
  updates: UpdateSessionV3Request
): Promise<ChatSessionV3> {
  // Validate updates with Zod
  const validatedUpdates = UpdateSessionV3RequestSchema.parse(updates)

  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/sessions/${sessionID}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedUpdates),
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return ChatSessionV3Schema.parse(data)
}

/**
 * Delete a chat session
 */
export async function deleteSessionV3(
  userID: string,
  sessionID: string
): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/sessions/${sessionID}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}
