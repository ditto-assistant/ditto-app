import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
} from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import { useAuth, useAuthToken } from "./useAuth"
import { BASE_URL } from "@/firebaseConfig"
import { Memory } from "@/api/getMemories"

interface ConversationResponse {
  items: Memory[]
  nextCursor: string
}

export interface OptimisticMemory extends Memory {
  isOptimistic?: boolean
  // Progressive image generation support
  generatedImagePartial?: string
  generatedImageURL?: string
}

type InfiniteQueryResult = ReturnType<
  typeof useInfiniteQuery<ConversationResponse>
>

interface ConversationContextType {
  messages: OptimisticMemory[]
  optimisticMessage: OptimisticMemory | null
  isLoading: InfiniteQueryResult["isLoading"]
  isFetchingNextPage: InfiniteQueryResult["isFetchingNextPage"]
  hasNextPage: InfiniteQueryResult["hasNextPage"]
  fetchNextPage: InfiniteQueryResult["fetchNextPage"]
  refetch: InfiniteQueryResult["refetch"]
  addOptimisticMessage: (userPrompt: string, imageURL?: string) => string
  updateOptimisticResponse: (pairId: string, responseChunk: string) => void
  finalizeOptimisticMessage: (pairId: string, finalResponse: string) => void
  clearOptimisticMessages: () => void
  setOptimisticPairID: (tempId: string, realId: string) => void
  setImagePartial: (pairId: string, index: number, b64: string) => void
  setImageCompleted: (pairId: string, url: string) => void
}

const ConversationContext = createContext<ConversationContextType | null>(null)

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const tok = useAuthToken()
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

  const serverMessages = data?.pages.flatMap((page) => page.items) || []

  // Check if the optimistic message has been persisted to the server
  const shouldIncludeOptimistic =
    optimisticMessage &&
    optimisticMessage.isOptimistic !== false &&
    !serverMessages.some((serverMsg) => serverMsg.id === optimisticMessage.id)

  // Combine server messages with optimistic message if it should be included
  const messages =
    shouldIncludeOptimistic && optimisticMessage
      ? [optimisticMessage, ...serverMessages]
      : serverMessages

  // Add a new optimistic message pair (user prompt + empty assistant response)
  const addOptimisticMessage = useCallback(
    (userPrompt: string, imageURL?: string): string => {
      const timestamp = Date.now()
      const tempPairId = `optimistic-${timestamp}`

      const newOptimisticMessage: OptimisticMemory = {
        id: tempPairId,
        // Legacy fields for backward compatibility
        prompt: userPrompt,
        response: "",
        // New v2 structure
        input: [{ type: "text" as const, content: userPrompt }],
        output: [],
        timestamp: new Date(timestamp),
        isOptimistic: true,
        score: 0,
        vector_distance: 0,
        depth: 0,
      }

      if (imageURL) {
        newOptimisticMessage.input?.push({
          type: "image" as const,
          content: imageURL,
        })
      }

      setOptimisticMessage(newOptimisticMessage)
      return tempPairId
    },
    []
  )

  // Update the streaming response of an optimistic message
  const updateOptimisticResponse = useCallback(
    (pairId: string, responseChunk: string) => {
      setOptimisticMessage((prev) => {
        if (!prev || prev.id !== pairId) return prev

        const currentContent = (prev.output || [])[0]?.content || ""
        const newContent = currentContent + responseChunk

        return {
          ...prev,
          output: [{ type: "text" as const, content: newContent }],
        }
      })
    },
    []
  )

  // Finalize an optimistic message by setting its final response
  const finalizeOptimisticMessage = useCallback(
    (pairId: string, finalResponse: string) => {
      setOptimisticMessage((prev) => {
        if (!prev || prev.id !== pairId) return prev

        return {
          ...prev,
          output: [{ type: "text" as const, content: finalResponse }],
          isOptimistic: false,
        }
      })

      setTimeout(() => {
        refetch()

        // Clear the optimistic message after refetch to ensure data is loaded
        setTimeout(() => {
          setOptimisticMessage(null)
        }, 1000) // Wait 1 second after refetch to ensure data is loaded
      }, 800)
    },
    [refetch]
  )

  // Clear the optimistic message
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessage(null)
  }, [])

  // Map temporary optimistic ID to real pair ID when server reports it
  const setOptimisticPairID = useCallback((tempId: string, realId: string) => {
    if (!tempId || !realId || tempId === realId) return
    setOptimisticMessage((prev) => {
      if (!prev || prev.id !== tempId) return prev
      return { ...prev, id: realId }
    })
  }, [])

  // Image generation progressive updates (partial frames)
  const setImagePartial = useCallback(
    (pairId: string, _index: number, b64: string) => {
      if (!pairId || !b64) return
      const dataUrl = `data:image/png;base64,${b64}`
      setOptimisticMessage((prev) => {
        if (!prev || prev.id !== pairId) return prev

        return {
          ...prev,
          generatedImagePartial: dataUrl,
        }
      })
    },
    []
  )

  const setImageCompleted = useCallback((pairId: string, url: string) => {
    if (!pairId || !url) return
    setOptimisticMessage((prev) => {
      if (!prev || prev.id !== pairId) return prev

      return {
        ...prev,
        generatedImagePartial: undefined,
        generatedImageURL: url,
      }
    })
  }, [])

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
    clearOptimisticMessages,
    setOptimisticPairID,
    setImagePartial,
    setImageCompleted,
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
