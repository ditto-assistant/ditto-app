import { createContext, useContext, ReactNode, useState } from "react"
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query"
import { useAuth, useAuthToken } from "./useAuth"
import { BASE_URL } from "@/firebaseConfig"
import { Memory } from "@/api/getMemories"
import { cancelPrompt, type PromptV2Content } from "@/api/LLM"

interface ConversationResponse {
  items: Memory[]
  nextCursor: string
}

import { ToolCallInfo } from "@/api/LLM"
import { ContentV2 } from "@/api/getMemories"

export interface OptimisticMemory extends Omit<Memory, "prompt" | "response"> {
  isOptimistic?: boolean
  // Progressive image generation support
  generatedImagePartial?: string
  generatedImageURL?: string
}

type InfiniteQueryResult = ReturnType<
  typeof useInfiniteQuery<ConversationResponse>
>

interface ConversationContextType {
  messages: Memory[]
  optimisticMessage: OptimisticMemory | null
  isLoading: InfiniteQueryResult["isLoading"]
  isFetchingNextPage: InfiniteQueryResult["isFetchingNextPage"]
  hasNextPage: InfiniteQueryResult["hasNextPage"]
  fetchNextPage: InfiniteQueryResult["fetchNextPage"]
  refetch: InfiniteQueryResult["refetch"]
  addOptimisticMessage: (input: PromptV2Content[]) => string
  updateOptimisticResponse: (responseChunk: string) => void
  finalizeOptimisticMessage: (finalizedPairId: string) => void
  setImagePartial: (index: number, b64: string) => void
  setImageCompleted: (url: string) => void
  addToolCalls: (toolCalls: ToolCallInfo[]) => void
  cancelPrompt: () => Promise<boolean>
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const tok = useAuthToken()
  const queryClient = useQueryClient()
  const [optimisticMessage, setOptimisticMessage] =
    useState<OptimisticMemory | null>(null)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<ConversationResponse>({
    queryKey: ["conversations", user?.uid, tok.data],
    queryFn: async ({ pageParam }) => {
      if (!tok.data) {
        throw new Error("No token found")
      }
      if (!user?.uid) {
        throw new Error("No user ID found")
      }
      const url = new URL(`${BASE_URL}/api/v2/users/${user.uid}/conversations`)
      url.searchParams.set("limit", "5")
      if (pageParam) {
        url.searchParams.set("cursor", pageParam as string)
      }
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${tok.data}`,
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch conversations")
      }
      return response.json() as Promise<ConversationResponse>
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: ConversationResponse) =>
      lastPage.nextCursor || undefined,
    enabled: !!user?.uid && !!tok.data,
  })

  const messages = data?.pages.flatMap((page) => page.items) || []

  // Add a new optimistic message pair (user prompt + empty assistant response)
  const addOptimisticMessage = (input: PromptV2Content[]): string => {
    const timestamp = Date.now()
    const tempPairId = `optimistic-${timestamp}`

    const newOptimisticMessage: OptimisticMemory = {
      id: tempPairId,
      // New v2 structure only
      input: input,
      output: [],
      timestamp: new Date(timestamp),
      isOptimistic: true,
      score: 0,
      vector_distance: 0,
      depth: 0,
    }

    setOptimisticMessage(newOptimisticMessage)
    return tempPairId
  }

  // Update the streaming response of an optimistic message
  const updateOptimisticResponse = (responseChunk: string) => {
    setOptimisticMessage((prev) => {
      if (!prev) return prev

      const currentOutput = prev.output || []
      const lastIndex = currentOutput.length - 1

      // If no output yet, create first text content
      if (currentOutput.length === 0) {
        return {
          ...prev,
          output: [{ type: "text" as const, content: responseChunk }],
        }
      }

      // If last item is text, append to it
      if (currentOutput[lastIndex]?.type === "text") {
        const updatedOutput = [...currentOutput]
        updatedOutput[lastIndex] = {
          ...updatedOutput[lastIndex],
          content: updatedOutput[lastIndex].content + responseChunk,
        }
        return {
          ...prev,
          output: updatedOutput,
        }
      }

      // If last item is not text (e.g., tool call), append new text content
      return {
        ...prev,
        output: [
          ...currentOutput,
          { type: "text" as const, content: responseChunk },
        ],
      }
    })
  }

  // Finalize an optimistic message by setting its final response
  const finalizeOptimisticMessage = (finalizedPairId: string) => {
    setOptimisticMessage((prev) => {
      if (!prev) return prev
      // Convert optimistic message to final Memory format
      const finalizedMessage: Memory = {
        id: finalizedPairId, // Use the finalized pairId instead of optimistic ID
        input: prev.input,
        output: prev.output,
        timestamp: prev.timestamp,
        score: prev.score,
        vector_distance: prev.vector_distance,
        depth: prev.depth,
      }
      // Update the cached data directly without refetching
      queryClient.setQueryData(
        ["conversations", user?.uid, tok.data],
        (oldData: InfiniteData<ConversationResponse> | undefined) => {
          if (!oldData) return oldData

          // Add the finalized message to the first page (most recent)
          if (oldData.pages.length === 0) {
            // If no pages exist, create the first page
            return {
              ...oldData,
              pages: [
                {
                  items: [finalizedMessage],
                  nextCursor: "",
                },
              ],
            }
          }

          // Check if the finalized message already exists in the first page (React Strict Mode)
          const firstPageItems = oldData.pages[0].items
          const messageExists = firstPageItems[0]?.id === finalizedPairId
          if (messageExists) {
            // Message already exists, return old data without modification
            return oldData
          }

          // Create new pages array with only the first page modified
          const newPages = [
            {
              ...oldData.pages[0],
              items: [finalizedMessage, ...oldData.pages[0].items],
            },
            ...oldData.pages.slice(1), // Keep other pages as-is (shallow copy is fine)
          ]

          return {
            ...oldData,
            pages: newPages,
          }
        }
      )
      console.log(
        "🚀 [useConversationHistory] Finalized optimistic message, setting to null"
      )
      return null
    })
  }

  // Image generation progressive updates (partial frames)
  const setImagePartial = (_index: number, b64: string) => {
    if (!b64) return
    const dataUrl = `data:image/png;base64,${b64}`
    setOptimisticMessage((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        generatedImagePartial: dataUrl,
      }
    })
  }

  const setImageCompleted = (url: string) => {
    if (!url) return
    setOptimisticMessage((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        generatedImagePartial: undefined,
        generatedImageURL: url,
      }
    })
  }

  const addToolCalls = (toolCalls: ToolCallInfo[]) => {
    if (!toolCalls || toolCalls.length === 0) return
    setOptimisticMessage((prev) => {
      if (!prev) return prev

      // Create ContentV2 objects for all tool calls
      const toolCallContents: ContentV2[] = toolCalls.map((toolCall) => ({
        type: "tool_call",
        content: "", // Tool calls don't have text content
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          args: toolCall.args,
        },
      }))

      return {
        ...prev,
        output: [...(prev.output || []), ...toolCallContents],
      }
    })
  }

  const value = {
    messages,
    optimisticMessage,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    addOptimisticMessage,
    updateOptimisticResponse,
    finalizeOptimisticMessage,
    setImagePartial,
    setImageCompleted,
    addToolCalls,
    cancelPrompt,
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
