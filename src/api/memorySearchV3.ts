import { z } from "zod"
import { auth } from "@/lib/firebase"
import { BASE_URL } from "@/firebaseConfig"

// Define the base schema first (without recursive references)
const baseMemoryV3Schema = z.object({
  id: z.string(),
  timestamp: z.string(),
  sessionID: z.string().optional(),
  input: z
    .array(
      z.object({
        type: z.enum(["text", "image"]),
        text: z.string().optional(),
        imageURL: z.string().optional(),
      })
    )
    .optional(),
  output: z
    .array(
      z.object({
        type: z.enum(["text", "image"]),
        text: z.string().optional(),
        imageURL: z.string().optional(),
      })
    )
    .optional(),
  actions: z
    .array(
      z.object({
        actionType: z.string(),
        toolName: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .optional(),
  vectorDistance: z.number().optional(),
  level: z.number().optional(),
})

// Define the TypeScript type including the recursive part
type MemoryV3 = z.infer<typeof baseMemoryV3Schema> & {
  children?: MemoryV3[]
}

// Create the full recursive schema with explicit typing
export const MemoryV3Schema: z.ZodType<MemoryV3> = baseMemoryV3Schema.extend({
  children: z.array(z.lazy(() => MemoryV3Schema)).optional(),
})

export const MemorySearchV3RequestSchema = z.object({
  userID: z.string(),
  query: z.string(),
  stripImages: z.boolean().optional(),
  nodeCounts: z.array(z.number()).optional(),
  nodeThresholds: z.array(z.number()).optional(), // float64 values for memory relevance thresholds
  deepSearch: z.boolean().optional(),
  shortTermK: z.number().optional(),
  maxResults: z.number().optional(),
})

export const MemorySearchV3ResponseSchema = z.object({
  longTerm: z.array(MemoryV3Schema).optional(),
  shortTerm: z.array(MemoryV3Schema).optional(),
  agenticSearch: z
    .object({
      generatedQueries: z
        .array(
          z.object({
            query: z.string(),
          })
        )
        .optional(),
      reasoning: z.string().optional(),
      iterationsUsed: z.number().optional(),
    })
    .optional(),
  totalResults: z.number(),
  query: z.string(),
  timestamp: z.string(),
})

export const MemorySearchSSEEventSchema = z.object({
  type: z.string(),
  content: z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    message: z.string().optional(),
    data: z.any().optional(),
  }),
})

// TypeScript types
export type { MemoryV3 }
export type MemorySearchV3Request = z.infer<typeof MemorySearchV3RequestSchema>
export type MemorySearchV3Response = z.infer<
  typeof MemorySearchV3ResponseSchema
>
export type MemorySearchSSEEvent = z.infer<typeof MemorySearchSSEEventSchema>

// Event handler types
export type MemorySearchProgressHandler = (message: string) => void
export type MemorySearchErrorHandler = (error: string) => void
export type MemorySearchResultsHandler = (
  results: MemorySearchV3Response
) => void
export type MemorySearchEventHandler = (event: MemorySearchSSEEvent) => void

/**
 * Search memories using V3 API with SSE streaming
 */
export async function searchMemoriesV3(
  userID: string,
  request: MemorySearchV3Request,
  onProgress: MemorySearchProgressHandler,
  onResults: MemorySearchResultsHandler,
  onError: MemorySearchErrorHandler,
  signal?: AbortSignal,
  onEvent?: MemorySearchEventHandler
): Promise<void> {
  // Validate request with Zod
  const validatedRequest = MemorySearchV3RequestSchema.parse(request)

  const user = auth.currentUser
  if (!user) {
    throw new Error("User not authenticated")
  }

  const token = await user.getIdToken()

  const response = await fetch(
    `${BASE_URL}/api/v3/users/${userID}/memories/search`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedRequest),
      signal,
    }
  )

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
            // Parse the event content
            const eventContent = JSON.parse(data)
            const event = MemorySearchSSEEventSchema.parse({
              type: currentEventType || "unknown",
              content: eventContent,
            })

            // Call the generic event handler if provided
            if (onEvent) {
              onEvent(event)
            }

            // Handle specific event types
            switch (event.type) {
              case "progress":
                onProgress(event.content.message || "")
                break
              case "error":
                onError(event.content.message || "Unknown error")
                return
              case "done":
                return
              case "memory.results":
                if (event.content.data) {
                  // Validate the response data
                  const validatedResults = MemorySearchV3ResponseSchema.parse(
                    event.content.data
                  )
                  onResults(validatedResults)
                }
                break
              case "memory.result":
                // Individual memory result - could be used for incremental updates
                if (event.content.data) {
                  console.log("Individual memory result:", event.content.data)
                }
                break
              default:
                console.log("Unknown memory search SSE event:", event)
            }
          } catch (e) {
            console.error(
              "Failed to parse memory search SSE event:",
              e,
              "Data:",
              data
            )
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Helper function to flatten hierarchical memory results for display
 */
export function flattenMemoriesV3(
  memories: MemoryV3[]
): (MemoryV3 & { level: number })[] {
  const result: (MemoryV3 & { level: number })[] = []

  function flatten(mems: MemoryV3[], level: number) {
    for (const mem of mems) {
      // Add the memory with its level
      result.push({ ...mem, level, children: undefined })

      // Recursively flatten children
      if (mem.children && mem.children.length > 0) {
        flatten(mem.children, level + 1)
      }
    }
  }

  flatten(memories, 1)
  return result
}

/**
 * Helper function to convert content arrays to display text
 */
export function contentArrayToText(
  contentArray?: Array<{ type: string; text?: string; imageURL?: string }>
): string {
  if (!contentArray || !Array.isArray(contentArray)) return ""
  return contentArray
    .filter((content) => content.type === "text")
    .map((content) => content.text || "")
    .join(" ")
}

/**
 * Helper function to extract images from content arrays
 */
export function extractImagesFromContentArray(
  contentArray?: Array<{ type: string; text?: string; imageURL?: string }>
): string[] {
  if (!contentArray || !Array.isArray(contentArray)) return []
  return contentArray
    .filter((content) => content.type === "image" && content.imageURL)
    .map((content) => content.imageURL!)
}
