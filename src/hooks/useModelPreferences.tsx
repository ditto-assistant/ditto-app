import { useContext, createContext } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { useUser } from "@/hooks/useUser"
import { DEFAULT_PREFERENCES } from "@/constants"
import { ModelPreferences } from "@/types/llm"
import { updateUserPreferences } from "@/api/updateUserPreferences"
import { toast } from "sonner"

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
  
  // Get user profile from API which includes preferences
  const { data: userProfile, isLoading: isUserLoading } = useUser()

  // Build model preferences from user profile data
  const preferences = useQuery({
    queryKey: ["modelPreferences", user?.uid, userProfile],
    queryFn: () => {
      // Return default preferences if no user
      if (!user?.uid) return DEFAULT_PREFERENCES

      // Start with defaults
      let modelPreferences = { ...DEFAULT_PREFERENCES }

      // Add API preferences if available
      if (userProfile) {
        if (userProfile.preferredMainModel) {
          modelPreferences.mainModel = userProfile.preferredMainModel
        }
        if (userProfile.preferredProgrammerModel) {
          modelPreferences.programmerModel = userProfile.preferredProgrammerModel
        }
        if (userProfile.preferredImageModel) {
          modelPreferences.imageGeneration = {
            ...modelPreferences.imageGeneration,
            model: userProfile.preferredImageModel,
          }
        }
      }

      return modelPreferences
    },
    enabled: !!user,
  })

  // Update preferences mutation
  const mutation = useMutation({
    mutationFn: async (newPreferences: Partial<ModelPreferences>) => {
      if (!user?.uid) throw new Error("No user")
      
      // Get current preferences
      const currentPrefs = preferences.data || DEFAULT_PREFERENCES
      
      // Merge with new preferences (only for local state)
      const updatedPreferences = {
        ...currentPrefs,
        ...newPreferences,
        memory: {
          ...currentPrefs.memory,
          ...(newPreferences.memory || {}),
        },
      }
      
      // Create update for API
      const userPreferencesUpdate = {
        preferredMainModel: newPreferences.mainModel,
        preferredProgrammerModel: newPreferences.programmerModel,
        preferredImageModel: newPreferences.imageGeneration?.model,
        // theme is handled separately, not included here
      }
      
      // Only include defined preferences in the update
      const filteredUpdate = Object.fromEntries(
        Object.entries(userPreferencesUpdate).filter(([_, v]) => v !== undefined)
      )
      
      // Update backend if there's anything to update
      if (Object.keys(filteredUpdate).length > 0) {
        const result = await updateUserPreferences(user.uid, filteredUpdate)
        if (result instanceof Error) {
          throw result
        }
      }
      
      return updatedPreferences
    },
    onSuccess: (data) => {
      // Update local cache immediately
      queryClient.setQueryData(["modelPreferences", user?.uid], data)
      // Invalidate user query to refetch from API
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error) => {
      if (error instanceof Error) {
        toast.error(`Failed to update preferences: ${error.message}`)
      } else {
        toast.error("Failed to update preferences")
      }
    }
  })

  return {
    preferences: preferences.data,
    updatePreferences: mutation.mutate,
    isLoading: isUserLoading || preferences.isLoading,
    isPending: mutation.isPending,
  }
}
