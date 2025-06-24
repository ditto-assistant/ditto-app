import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth, useAuthToken } from "./useAuth"
import {
  getConversationsV3,
  type MemoryV3,
  type ConversationsV3Response,
  type ContentV3,
} from "@/api/chatV3"

// Sub-agent tracking for real-time updates
export interface SubAgentDisplay {
  id: string
  agentType: "research" | "art"
  query: string
  status: "running" | "completed" | "error"
  toolCalls: SubAgentToolCall[]
  summary?: string
  isCollapsed: boolean
}

export interface SubAgentToolCall {
  tool: string
  query?: string
  url?: string
  timestamp: string
}

// Updated optimistic memory for v3
interface OptimisticMemoryV3 extends MemoryV3 {
  isOptimistic?: boolean
  streamingOutput?: ContentV3[]
  subAgents?: SubAgentDisplay[]
}

type InfiniteQueryResult = ReturnType<
  typeof useInfiniteQuery<ConversationsV3Response>
>

interface ConversationContextType {
  messages: OptimisticMemoryV3[]
  isLoading: InfiniteQueryResult["isLoading"]
  isFetchingNextPage: InfiniteQueryResult["isFetchingNextPage"]
  hasNextPage: InfiniteQueryResult["hasNextPage"]
  fetchNextPage: InfiniteQueryResult["fetchNextPage"]
  refetch: InfiniteQueryResult["refetch"]
  // Legacy API for backward compatibility (converts strings to ContentV3[])
  addOptimisticMessage: (userPrompt: string, imageURL?: string) => string
  updateOptimisticResponse: (pairId: string, responseChunk: string) => void
  finalizeOptimisticMessage: (
    pairId: string,
    finalResponse: string,
    forceRemove?: boolean
  ) => void
  clearOptimisticMessages: () => void
  // New v3 API methods
  addOptimisticMessageV3: (userInput: ContentV3[], sessionID?: string) => string
  updateOptimisticResponseV3: (
    pairId: string,
    outputContent: ContentV3[]
  ) => void
  finalizeOptimisticMessageV3: (
    pairId: string,
    finalOutput: ContentV3[],
    forceRemove?: boolean
  ) => void
  contentArrayToString: (content: ContentV3[]) => string
  // SSE event handlers for real-time updates
  handleToolCallSSE: (pairId: string, toolInfo: unknown) => void
  handleToolResultSSE: (pairId: string, toolInfo: unknown) => void
  // Sub-agent SSE event handlers
  handleSubAgentStartSSE: (pairId: string, subAgentInfo: unknown) => void
  handleSubAgentToolCallSSE: (pairId: string, toolCallInfo: unknown) => void
  handleSubAgentCompleteSSE: (pairId: string, completeInfo: unknown) => void
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const tok = useAuthToken()
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMemoryV3[]
  >([])

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<ConversationsV3Response>({
    queryKey: ["conversations-v3", user?.uid, tok.data],
    queryFn: async ({ pageParam }) => {
      if (!user?.uid) {
        throw new Error("No user ID found")
      }
      return getConversationsV3(user.uid, {
        limit: 5,
        cursor: pageParam as string | undefined,
      })
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: ConversationsV3Response) =>
      lastPage.nextCursor || undefined,
    enabled: !!user?.uid && !!tok.data,
  })


  // Memoize server messages from v3 response (1D conversations array)
  const serverMessages = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.conversations)
  }, [data?.pages])

  // Filter out optimistic messages that have been persisted to the server
  // More aggressive filtering to prevent duplicates
  const filteredOptimisticMessages = useMemo(() => {
    return optimisticMessages.filter((optMsg) => {
      // Keep non-optimistic messages in the list temporarily (they'll be removed after a refetch cycle)
      if (optMsg.isOptimistic === false) {
        // If we've marked it as no longer optimistic but it's still in our array,
        // keep it for this render cycle to prevent flickering
        return true
      }

      // Check if this optimistic message has been persisted to the server
      const matchingServerMsg = serverMessages.find((serverMsg) => {
        // Match only by exact ID (not by content)
        // This ensures uniquely generated message IDs don't get filtered out
        if (serverMsg.id === optMsg.id) {
          return true
        }

        return false
      })

      return !matchingServerMsg
    })
  }, [optimisticMessages, serverMessages])

  // Enhanced debug logging for message state (disabled in production)
  useEffect(() => {
    if (import.meta.env.MODE === "development") {
      console.log("🔄 [ConversationHistory] Message state update:", {
        serverCount: serverMessages.length,
        optimisticCount: optimisticMessages.length,
        totalDisplayed:
          filteredOptimisticMessages.length + serverMessages.length,
      })
    }
  }, [serverMessages, optimisticMessages, filteredOptimisticMessages])

  // Keep track of which messages have been finalized to avoid premature cleanup
  // This only removes optimistic messages that have been fully finalized and saved to server
  useEffect(() => {
    // Skip if we don't have both types of messages
    if (serverMessages.length === 0 || optimisticMessages.length === 0) {
      return
    }

    // If we have any non-finalized optimistic messages, don't do cleanup yet
    // This ensures tool responses stay visible during processing
    const hasActiveOptimisticMessages = optimisticMessages.some(
      (msg) => msg.isOptimistic === true
    )
    if (hasActiveOptimisticMessages) {
      return
    }

    // Find and remove optimistic messages that have been finalized and saved to server
    // Only remove finalized messages (isOptimistic === false) that exist on the server
    const messagesToRemove = optimisticMessages.filter(
      (optMsg) =>
        // Only consider non-optimistic messages for removal
        optMsg.isOptimistic === false &&
        // And only if they exist on the server
        serverMessages.some((serverMsg) => serverMsg.id === optMsg.id)
    )

    if (messagesToRemove.length > 0) {
      setOptimisticMessages((prev) =>
        prev.filter(
          (msg) => !messagesToRemove.some((toRemove) => toRemove.id === msg.id)
        )
      )
    }
  }, [serverMessages, optimisticMessages])

  // Cleanup stale optimistic messages
  useEffect(() => {
    // Only run if we have optimistic messages
    if (optimisticMessages.length > 0) {
      // Look for optimistic messages that are older than 2 minutes
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000

      const staleMessages = optimisticMessages.filter((msg) => {
        // Check if message is older than 2 minutes and still marked as optimistic
        const isStale =
          msg.isOptimistic === true &&
          (msg.timestamp ? msg.timestamp.getTime() : 0) < twoMinutesAgo
        return isStale
      })

      // If we have stale messages, remove them
      if (staleMessages.length > 0) {
        setOptimisticMessages((prev) =>
          prev.filter(
            (msg) => !staleMessages.some((stale) => stale.id === msg.id)
          )
        )
      }

      // Also remove finalized messages after they've been in the array for a while
      // This helps clean up the transition state
      const finalizedTimeout = Date.now() - 30 * 1000 // 30 seconds
      const finalizedMessages = optimisticMessages.filter((msg) => {
        return (
          msg.isOptimistic === false &&
          (msg.timestamp ? msg.timestamp.getTime() : 0) < finalizedTimeout
        )
      })

      if (finalizedMessages.length > 0) {
        setOptimisticMessages((prev) =>
          prev.filter(
            (msg) => !finalizedMessages.some((final) => final.id === msg.id)
          )
        )
      }
    }
  }, [optimisticMessages])

  // Combine server and optimistic messages, with optimistic messages at the beginning (most recent)
  const messages = useMemo(() => {
    return [...filteredOptimisticMessages, ...serverMessages]
  }, [filteredOptimisticMessages, serverMessages])

  // Clear all optimistic messages
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages([])
  }, [])

  // Helper function to convert content arrays to string for backward compatibility
  const contentArrayToString = useCallback((content: ContentV3[]): string => {
    if (!content || !Array.isArray(content)) {
      return ""
    }

    return content
      .map((item) => {
        if (!item || typeof item !== "object") {
          return ""
        }

        if (item.type === "text") {
          return typeof item.text === "string" ? item.text : ""
        } else if (item.type === "image") {
          return item.imageURL ? `![Image](${item.imageURL})` : "[Image]"
        } else if (item.type === "tool_call") {
          return `🛠️ **${item.toolName || "Tool"}**: ${item.toolCallID || "Running..."}`
        } else if (item.type === "tool_result") {
          const output = item.toolOutput || {}
          const resultText =
            typeof output === "object"
              ? JSON.stringify(output, null, 2)
              : String(output)
          return `✅ **Tool Result**: ${resultText}`
        }
        return ""
      })
      .filter(Boolean)
      .join("\n\n")
      .trim()
  }, [])

  // V3 API method for adding optimistic messages with ContentV3[]
  const addOptimisticMessageV3 = useCallback(
    (userInput: ContentV3[], sessionID?: string): string => {
      const timestamp = Date.now()
      const tempPairId = `optimistic-${timestamp}`

      const newOptimisticMessage: OptimisticMemoryV3 = {
        id: tempPairId,
        input: userInput,
        output: [],
        timestamp: new Date(timestamp),
        sessionID: sessionID || `session-${tempPairId}`,
        isOptimistic: true,
        streamingOutput: [],
      }

      setOptimisticMessages((prev) => [newOptimisticMessage, ...prev])
      return tempPairId
    },
    []
  )

  // V3 API method for updating optimistic message output
  const updateOptimisticResponseV3 = useCallback(
    (pairId: string, outputContent: ContentV3[]) => {
      setOptimisticMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === pairId)
        if (!messageExists) {
          return prev
        }

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                streamingOutput: outputContent,
                output: outputContent,
              }
            : msg
        )
      })
    },
    []
  )

  // V3 API method for finalizing optimistic messages
  const finalizeOptimisticMessageV3 = useCallback(
    (pairId: string, finalOutput: ContentV3[], forceRemove = false) => {
      // Handle force remove signal from tool completion
      if (forceRemove) {
        setOptimisticMessages((prev) => prev.filter((msg) => msg.id !== pairId))
        return
      }

      setOptimisticMessages((prev) => {
        const messageExists = prev.some((msg) => msg.id === pairId)
        if (!messageExists) {
          return prev
        }

        // Check if this is a tool response that needs to stay visible during processing
        const hasToolResponse = finalOutput.some((content) => {
          if (content.type === "tool_call" || content.type === "tool_result") {
            return true
          }
          return (
            content.type === "text" &&
            content.text &&
            (content.text.includes("<OPENSCAD>") ||
              content.text.includes("<HTML_SCRIPT>") ||
              content.text.includes("<IMAGE_GENERATION>") ||
              content.text.includes("<GOOGLE_SEARCH>"))
          )
        })

        // Keep the message in the optimistic state array but mark it differently
        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                output: finalOutput,
                streamingOutput: undefined,
                // For tool responses, keep isOptimistic true to prevent cleanup
                isOptimistic: hasToolResponse,
              }
            : msg
        )
      })

      // Only trigger refetch for non-tool responses
      const hasToolResponse = finalOutput.some((content) => {
        if (content.type === "tool_call" || content.type === "tool_result") {
          return true
        }
        return (
          content.type === "text" &&
          content.text &&
          (content.text.includes("<OPENSCAD>") ||
            content.text.includes("<HTML_SCRIPT>") ||
            content.text.includes("<IMAGE_GENERATION>") ||
            content.text.includes("<GOOGLE_SEARCH>"))
        )
      })

      if (!hasToolResponse) {
        // For regular responses without tools, trigger refetch and cleanup
        setTimeout(() => {
          refetch()

          // Only remove after refetch for non-tool responses
          setTimeout(() => {
            setOptimisticMessages((prev) =>
              prev.filter((msg) => msg.id !== pairId)
            )
          }, 1000) // Wait 1 second after refetch to ensure data is loaded
        }, 800)
      }
    },
    [refetch]
  )

  // Backward compatibility function for adding optimistic messages with string prompts
  const addOptimisticMessageLegacy = useCallback(
    (userPrompt: string, imageURL?: string): string => {
      const input: ContentV3[] = [{ type: "text", text: userPrompt }]
      if (imageURL) {
        input.push({ type: "image", imageURL })
      }
      return addOptimisticMessageV3(input)
    },
    [addOptimisticMessageV3]
  )

  // Backward compatibility function for updating streaming responses with strings
  const updateOptimisticResponseLegacy = useCallback(
    (pairId: string, responseChunk: string) => {
      // Ensure responseChunk is a string to prevent markdown errors
      const safeChunk =
        typeof responseChunk === "string"
          ? responseChunk
          : String(responseChunk || "")

      // Get current streaming content and append the chunk
      setOptimisticMessages((prev) => {
        const message = prev.find((msg) => msg.id === pairId)
        if (!message) return prev

        const currentText = message.streamingOutput?.[0]?.text || ""
        const newText = currentText + safeChunk
        const newOutput: ContentV3[] = [{ type: "text", text: newText }]

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                streamingOutput: newOutput,
                output: newOutput,
              }
            : msg
        )
      })
    },
    []
  )

  // Backward compatibility function for finalizing with string responses
  const finalizeOptimisticMessageLegacy = useCallback(
    (pairId: string, finalResponse: string, forceRemove = false) => {
      // Ensure finalResponse is a string to prevent markdown errors
      const safeResponse =
        typeof finalResponse === "string"
          ? finalResponse
          : String(finalResponse || "")
      const finalOutput: ContentV3[] = [{ type: "text", text: safeResponse }]
      return finalizeOptimisticMessageV3(pairId, finalOutput, forceRemove)
    },
    [finalizeOptimisticMessageV3]
  )

  // Handle tool call SSE events in real-time
  const handleToolCallSSE = useCallback((pairId: string, toolInfo: unknown) => {
    console.log("🛠️ [ConversationHistory] Tool call SSE:", { pairId, toolInfo })

    setOptimisticMessages((prev) => {
      const message = prev.find((msg) => msg.id === pairId)
      if (!message) return prev

      // Add tool call to the output
      const info = toolInfo as {
        id?: string
        name?: string
        body?: Record<string, unknown>
      }
      const toolCallContent: ContentV3 = {
        type: "tool_call",
        toolCallID: info.id || `tool-${Date.now()}`,
        toolName: info.name || "Unknown Tool",
        toolArgs: info.body || {},
      }

      const currentOutput = message.output || []
      const newOutput = [...currentOutput, toolCallContent]

      return prev.map((msg) =>
        msg.id === pairId
          ? {
              ...msg,
              output: newOutput,
              streamingOutput: newOutput,
            }
          : msg
      )
    })
  }, [])

  // Handle tool result SSE events in real-time
  const handleToolResultSSE = useCallback(
    (pairId: string, toolInfo: unknown) => {
      console.log("✅ [ConversationHistory] Tool result SSE:", {
        pairId,
        toolInfo,
      })

      setOptimisticMessages((prev) => {
        const message = prev.find((msg) => msg.id === pairId)
        if (!message) return prev

        // Add tool result to the output
        const info = toolInfo as {
          id?: string
          name?: string
          body?: Record<string, unknown>
          isError?: boolean
        }
        const toolResultContent: ContentV3 = {
          type: "tool_result",
          toolResultID: info.id || `result-${Date.now()}`,
          toolName: info.name || "Unknown Tool",
          toolOutput: info.body || {},
          isError: info.isError || false,
        }

        const currentOutput = message.output || []
        const newOutput = [...currentOutput, toolResultContent]

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                output: newOutput,
                streamingOutput: newOutput,
              }
            : msg
        )
      })
    },
    []
  )

  // Handle sub-agent start SSE events
  const handleSubAgentStartSSE = useCallback(
    (pairId: string, subAgentInfo: unknown) => {
      console.log("🚀 [ConversationHistory] Sub-agent start SSE:", {
        pairId,
        subAgentInfo,
      })

      setOptimisticMessages((prev) => {
        const message = prev.find((msg) => msg.id === pairId)
        if (!message) return prev

        const info = subAgentInfo as {
          sub_agent_id?: string
          agent_type?: "research" | "art"
          query?: string
        }

        const newSubAgent: SubAgentDisplay = {
          id: info.sub_agent_id || `subagent-${Date.now()}`,
          agentType: info.agent_type || "research",
          query: info.query || "",
          status: "running",
          toolCalls: [],
          isCollapsed: false, // Start expanded
        }

        const currentSubAgents = message.subAgents || []
        const newSubAgents = [...currentSubAgents, newSubAgent]

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                subAgents: newSubAgents,
              }
            : msg
        )
      })
    },
    []
  )

  // Handle sub-agent tool call SSE events
  const handleSubAgentToolCallSSE = useCallback(
    (pairId: string, toolCallInfo: unknown) => {
      console.log("🛠️ [ConversationHistory] Sub-agent tool call SSE:", {
        pairId,
        toolCallInfo,
      })

      setOptimisticMessages((prev) => {
        const message = prev.find((msg) => msg.id === pairId)
        if (!message) return prev

        const info = toolCallInfo as {
          sub_agent_id?: string
          tool_call_id?: string
          tool_name?: string
          tool_args?: Record<string, unknown>
          timestamp?: string
        }

        const subAgentId = info.sub_agent_id
        if (!subAgentId) return prev

        const newToolCall: SubAgentToolCall = {
          tool: info.tool_name || "unknown",
          query:
            (info.tool_args?.query as string) ||
            (info.tool_args?.url as string) ||
            "",
          url: info.tool_args?.url as string,
          timestamp: info.timestamp || new Date().toISOString(),
        }

        const currentSubAgents = message.subAgents || []
        const updatedSubAgents = currentSubAgents.map((subAgent) =>
          subAgent.id === subAgentId
            ? {
                ...subAgent,
                toolCalls: [...subAgent.toolCalls, newToolCall],
              }
            : subAgent
        )

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                subAgents: updatedSubAgents,
              }
            : msg
        )
      })
    },
    []
  )

  // Handle sub-agent complete SSE events
  const handleSubAgentCompleteSSE = useCallback(
    (pairId: string, completeInfo: unknown) => {
      console.log("✅ [ConversationHistory] Sub-agent complete SSE:", {
        pairId,
        completeInfo,
      })

      setOptimisticMessages((prev) => {
        const message = prev.find((msg) => msg.id === pairId)
        if (!message) return prev

        const info = completeInfo as {
          sub_agent_id?: string
          summary?: string
          tool_calls?: SubAgentToolCall[]
        }

        const subAgentId = info.sub_agent_id
        if (!subAgentId) return prev

        const currentSubAgents = message.subAgents || []
        const updatedSubAgents = currentSubAgents.map((subAgent) =>
          subAgent.id === subAgentId
            ? {
                ...subAgent,
                status: "completed" as const,
                summary: info.summary,
                isCollapsed: true, // Auto-collapse when complete
              }
            : subAgent
        )

        return prev.map((msg) =>
          msg.id === pairId
            ? {
                ...msg,
                subAgents: updatedSubAgents,
              }
            : msg
        )
      })
    },
    []
  )

  const value = {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    addOptimisticMessage: addOptimisticMessageLegacy, // Use legacy for now for backward compatibility
    updateOptimisticResponse: updateOptimisticResponseLegacy, // Use legacy for now
    finalizeOptimisticMessage: finalizeOptimisticMessageLegacy, // Use legacy for now
    clearOptimisticMessages,
    // New v3 methods
    addOptimisticMessageV3: addOptimisticMessageV3,
    updateOptimisticResponseV3: updateOptimisticResponseV3,
    finalizeOptimisticMessageV3: finalizeOptimisticMessageV3,
    contentArrayToString,
    // SSE event handlers
    handleToolCallSSE,
    handleToolResultSSE,
    // Sub-agent SSE event handlers
    handleSubAgentStartSSE,
    handleSubAgentToolCallSSE,
    handleSubAgentCompleteSSE,
  }

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  )
}

export function useConversationHistory() {
  const context = useContext(ConversationContext)
  if (!context) {
    throw new Error(
      "useConversationHistory must be used within a ConversationProvider"
    )
  }
  return context
}
