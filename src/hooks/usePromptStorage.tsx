import { useContext, createContext, useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import {
  savePromptDraft,
  getPromptDraft,
  clearPromptDraft,
} from "@/api/userDrafts"
import { debounce } from "perfect-debounce"

interface PromptData {
  prompt: string
}

interface PromptStorageContextType {
  promptData: PromptData | null
  isLoading: boolean
  error: Error | null
  savePrompt: (prompt: string) => void
  clearPrompt: () => void
}

const PromptStorageContext = createContext<
  PromptStorageContextType | undefined
>(undefined)

export function usePromptStorage() {
  const context = useContext(PromptStorageContext)
  if (context === undefined) {
    throw new Error(
      "usePromptStorage must be used within a PromptStorageProvider"
    )
  }
  return context
}

export function PromptStorageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const value = usePromptStorageData()
  return (
    <PromptStorageContext.Provider value={value}>
      {children}
    </PromptStorageContext.Provider>
  )
}

function usePromptStorageData(): PromptStorageContextType {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [debounceSave] = useState(() =>
    debounce(async (userId: string, prompt: string) => {
      const result = await savePromptDraft(userId, prompt, "")
      if (result instanceof Error) {
        console.error("Error saving draft:", result)
      }
    }, 500)
  )

  // Query to fetch saved prompt
  const query = useQuery({
    queryKey: ["promptStorage", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user")
      const result = await getPromptDraft(user.uid)
      if (result instanceof Error) {
        if (result.message === "No draft found") {
          return { prompt: "" }
        }
        throw result
      }
      return result
    },
    enabled: !!user,
    staleTime: 2000,
    refetchOnWindowFocus: true,
  })

  // Mutation to save prompt
  const saveMutation = useMutation({
    mutationFn: async ({ prompt }: { prompt: string }) => {
      if (!user?.uid) throw new Error("No user")
      if (!prompt.trim()) {
        const result = await clearPromptDraft(user.uid)
        if (result instanceof Error) {
          throw result
        }
        return { prompt: "" }
      }
      debounceSave(user.uid, prompt)
      return { prompt }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data)
    },
  })

  // Mutation to clear prompt
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("No user")
      const result = await clearPromptDraft(user.uid)
      if (result instanceof Error) {
        throw result
      }
      return { prompt: "" }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data)
    },
  })
  const { mutate: savePromptMutate } = saveMutation
  const { mutate: clearPromptMutate } = clearMutation

  // Wrapper functions for mutations
  const savePrompt = useCallback(
    (prompt: string) => {
      savePromptMutate({ prompt })
    },
    [savePromptMutate]
  )

  const clearPrompt = useCallback(() => {
    clearPromptMutate()
  }, [clearPromptMutate])

  return {
    promptData: query.data || null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    savePrompt,
    clearPrompt,
  }
}
