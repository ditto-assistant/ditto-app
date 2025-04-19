import {
  useContext,
  createContext,
  useState,
  useEffect,
  useCallback
} from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import {
  savePromptToFirestore,
  getPromptFromFirestore,
  clearPromptFromFirestore
} from "@/control/firebase"
import { debounce, DebouncedFunction } from "@/utils/debounce"

interface PromptData {
  prompt: string
  image: string
}

interface PromptStorageContextType {
  promptData: PromptData | null
  isLoading: boolean
  error: Error | null
  savePrompt: (prompt: string, image?: string) => void
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
  children
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
  const [debounceSave] = useState<
    DebouncedFunction<(userId: string, prompt: string, image?: string) => void>
  >(() =>
    debounce((userId: string, prompt: string, image: string = "") => {
      savePromptToFirestore(userId, prompt, image)
    }, 500)
  )

  // Cancel debounced function on unmount
  useEffect(() => {
    return () => {
      debounceSave.cancel()
    }
  }, [debounceSave])

  // Query to fetch saved prompt
  const query = useQuery({
    queryKey: ["promptStorage", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user")
      const data = await getPromptFromFirestore(user.uid)
      return data || { prompt: "", image: "" }
    },
    enabled: !!user,
    staleTime: 2000,
    refetchOnWindowFocus: true
  })

  // Mutation to save prompt
  const saveMutation = useMutation({
    mutationFn: async ({
      prompt,
      image = ""
    }: {
      prompt: string
      image?: string
    }) => {
      if (!user?.uid) throw new Error("No user")
      if (!prompt.trim() && !image) {
        await clearPromptFromFirestore(user.uid)
        return { prompt: "", image: "" }
      }
      debounceSave(user.uid, prompt, image)
      return { prompt, image }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data)
    }
  })

  // Mutation to clear prompt
  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!user?.uid) throw new Error("No user")
      await clearPromptFromFirestore(user.uid)
      return { prompt: "", image: "" }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["promptStorage", user?.uid], data)
    }
  })
  const { mutate: savePromptMutate } = saveMutation
  const { mutate: clearPromptMutate } = clearMutation

  // Wrapper functions for mutations
  const savePrompt = useCallback(
    (prompt: string, image: string = "") => {
      savePromptMutate({ prompt, image })
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
    clearPrompt
  }
}
