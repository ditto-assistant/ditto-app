import { z } from "zod"
import { auth } from "@/lib/firebase"
import { BASE_URL } from "@/firebaseConfig"

// Zod schemas for type validation
export const ContentV3Schema = z.object({
  type: z.enum(["text", "image", "tool_call", "tool_result"]),
  text: z.string().optional(),
  imageURL: z.string().optional(),
  // Tool call fields
  toolCallID: z.string().optional(),
  toolName: z.string().optional(),
  toolArgs: z.record(z.any()).optional(),
  // Tool result fields
  toolResultID: z.string().optional(),
  toolOutput: z.record(z.any()).optional(),
  isError: z.boolean().optional(),
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

export const MemoryV3Schema = z.object({
  id: z.string(),
  timestamp: z.coerce.date(),
  sessionID: z.string().optional(),
  input: z.array(ContentV3Schema).optional(),
  output: z.array(ContentV3Schema).optional(),
})

export const ConversationSessionV3Schema = z.object({
  sessionID: z.string(),
  messages: z.array(MemoryV3Schema),
})

export const ConversationsV3ResponseSchema = z.object({
  conversations: z.array(MemoryV3Schema),
  nextCursor: z.string().optional(),
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
export type MemoryV3 = z.infer<typeof MemoryV3Schema>
export type ConversationSessionV3 = z.infer<typeof ConversationSessionV3Schema>
export type ConversationsV3Response = z.infer<
  typeof ConversationsV3ResponseSchema
>
export type SSEEvent = z.infer<typeof SSEEventSchema>

export type SSEEventHandler = (event: SSEEvent) => void
export type SSEContentHandler = (content: string) => void
export type SSEErrorHandler = (error: string) => void
export type SSEToolCallHandler = (toolCalls: unknown[]) => void
export type SSEToolResultHandler = (toolResults: unknown[]) => void
export type SSESessionCreatedHandler = (sessionID: string) => void
export type SSESubAgentStartHandler = (subAgentInfo: unknown) => void
export type SSESubAgentToolCallHandler = (toolCallInfo: unknown) => void
export type SSESubAgentCompleteHandler = (completeInfo: unknown) => void

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
  onSessionCreated?: SSESessionCreatedHandler,
  onSubAgentStart?: SSESubAgentStartHandler,
  onSubAgentToolCall?: SSESubAgentToolCallHandler,
  onSubAgentComplete?: SSESubAgentCompleteHandler
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
                case "sub_agent.start":
                  if (onSubAgentStart && event.content.data) {
                    onSubAgentStart(event.content.data)
                  }
                  break
                case "sub_agent.tool_call":
                  if (onSubAgentToolCall && event.content.data) {
                    onSubAgentToolCall(event.content.data)
                  }
                  break
                case "sub_agent.complete":
                  if (onSubAgentComplete && event.content.data) {
                    onSubAgentComplete(event.content.data)
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

/**
 * Get conversations grouped by sessionID
 */
export async function getConversationsV3(
  userID: string,
  options: {
    limit?: number
    cursor?: string
  } = {}
): Promise<ConversationsV3Response> {
  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const params = new URLSearchParams()
  if (options.limit) params.append("limit", options.limit.toString())
  if (options.cursor) params.append("cursor", options.cursor)

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/conversations?${params}`,
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
  return ConversationsV3ResponseSchema.parse(data)
}
