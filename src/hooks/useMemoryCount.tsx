import React, { useContext, createContext, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getConversationCount,
  ConversationCountResponse,
} from "@/api/userContent"
import { useAuth } from "./useAuth"

interface MemoryCountContextValue {
  count: number
  loading: boolean
  error: string | null
  refetch: () => void
}

const MemoryCountContext = createContext<MemoryCountContextValue | undefined>(
  undefined
)

export function useMemoryCount(): MemoryCountContextValue {
  const context = useContext(MemoryCountContext)
  if (context === undefined) {
    throw new Error("useMemoryCount must be used within a MemoryCountProvider")
  }
  return context
}

interface MemoryCountProviderProps {
  children: React.ReactNode
}

export function MemoryCountProvider({ children }: MemoryCountProviderProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<ConversationCountResponse, Error>({
    queryKey: ["memory-count", user?.uid],
    queryFn: async (): Promise<ConversationCountResponse> => {
      if (!user?.uid) {
        throw new Error("User not authenticated")
      }

      const result = await getConversationCount(user.uid)
      if (result instanceof Error) {
        throw result
      }
      return result
    },
    enabled: !!user?.uid,
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  })

  // Handle real-time updates by invalidating the query
  // Set up event listeners for real-time updates
  useEffect(() => {
    const handleMemoryUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["memory-count", user?.uid] })
    }

    if (user?.uid) {
      window.addEventListener("memoryUpdated", handleMemoryUpdate)
      return () => {
        window.removeEventListener("memoryUpdated", handleMemoryUpdate)
      }
    }
  }, [queryClient, user])

  const contextValue: MemoryCountContextValue = {
    count: query.data?.count ?? 0,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: () =>
      queryClient.invalidateQueries({ queryKey: ["memory-count", user?.uid] }),
  }

  return (
    <MemoryCountContext.Provider value={contextValue}>
      {children}
    </MemoryCountContext.Provider>
  )
}
