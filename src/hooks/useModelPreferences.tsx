import { useContext, createContext } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import {
  saveModelPreferencesToFirestore,
  getModelPreferencesFromFirestore,
} from "@/control/firebase"
import { DEFAULT_PREFERENCES } from "@/constants"
import { ModelPreferences } from "@/types/llm"

const ModelPreferencesContext = createContext<
  ReturnType<typeof useModels> | undefined
>(undefined)

export function useModelPreferences() {
  const context = useContext(ModelPreferencesContext)
  if (context === undefined) {
    throw new Error(
      "useModelPreferences must be used within a ModelPreferencesProvider"
    )
  }
  return context
}

export function ModelPreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const value = useModels()
  return (
    <ModelPreferencesContext.Provider value={value}>
      {children}
    </ModelPreferencesContext.Provider>
  )
}

function useModels() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["modelPreferences", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user")
      const prefs = (await getModelPreferencesFromFirestore(
        user.uid
      )) as ModelPreferences | null
      if (!prefs) return DEFAULT_PREFERENCES

      return {
        ...DEFAULT_PREFERENCES,
        ...prefs,
        memory: {
          ...DEFAULT_PREFERENCES.memory,
          ...prefs.memory,
        },
      }
    },
    enabled: !!user,
  })

  const mutation = useMutation({
    mutationFn: async (newPreferences: Partial<ModelPreferences>) => {
      if (!user?.uid) throw new Error("No user")
      const currentPrefs = query.data || DEFAULT_PREFERENCES
      const updatedPreferences = {
        ...currentPrefs,
        ...newPreferences,
        memory: {
          ...currentPrefs.memory,
          ...(newPreferences.memory || {}),
        },
      }
      await saveModelPreferencesToFirestore(user.uid, updatedPreferences)
      return updatedPreferences
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["modelPreferences", user?.uid], data)
    },
  })

  return {
    preferences: query.data,
    updatePreferences: mutation.mutate,
    isLoading: query.isLoading,
  }
}
