import { useContext, createContext } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { DEFAULT_PREFERENCES } from "@/constants"
import { ModelPreferences } from "@/types/llm"
import { useAuth } from "./useAuth"
import { useUser } from "./useUser"
import {
  UserPreferencesUpdate,
  updateUserPreferences,
} from "@/api/userPreferences"
import { User } from "@/api/getUser"

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
      if (userProfile?.preferences) {
        const prefs = userProfile.preferences

        if (prefs.preferredModels) {
          // Update main model
          if (prefs.preferredModels.mainModel) {
            modelPreferences.mainModel = prefs.preferredModels.mainModel
          }

          // Update programmer model
          if (prefs.preferredModels.programmerModel) {
            modelPreferences.programmerModel =
              prefs.preferredModels.programmerModel
          }

          // Update image generation model
          if (prefs.preferredModels.imageModel) {
            modelPreferences.imageGeneration = {
              ...modelPreferences.imageGeneration,
              model: prefs.preferredModels.imageModel,
            }
          }

          // Update image size if specified
          if (prefs.preferredModels.imageModelSize) {
            modelPreferences.imageGeneration = {
              ...modelPreferences.imageGeneration,
              size: {
                wh: prefs.preferredModels.imageModelSize,
              },
            }
          }
        }

        // Update tools preferences
        if (prefs.tools) {
          modelPreferences.tools = {
            ...modelPreferences.tools,
            ...prefs.tools,
          }
        }

        // Update memory preferences
        if (prefs.memory) {
          modelPreferences.memory = {
            ...modelPreferences.memory,
            ...prefs.memory,
          }
        }
      }

      console.log("Built preferences from user profile:", modelPreferences)
      return modelPreferences
    },
    enabled: !!user,
    placeholderData: (prev) => prev as ModelPreferences | undefined,
  })

  // Update preferences mutation
  const mutation = useMutation({
    mutationFn: async (newPreferences: Partial<ModelPreferences>) => {
      if (!user?.uid) throw new Error("No user")

      // For debugging
      console.log("Updating preferences:", newPreferences)

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
        tools: {
          ...currentPrefs.tools,
          ...(newPreferences.tools || {}),
        },
        imageGeneration: {
          ...currentPrefs.imageGeneration,
          ...(newPreferences.imageGeneration || {}),
        },
      }

      // For debugging
      console.log("Merged preferences:", updatedPreferences)

      // Create update for API with the new format
      const userPreferencesUpdate: UserPreferencesUpdate = {}

      // Add model updates if any
      if (
        newPreferences.mainModel ||
        newPreferences.programmerModel ||
        newPreferences.imageGeneration?.model
      ) {
        userPreferencesUpdate.preferredModels = {}

        if (newPreferences.mainModel) {
          userPreferencesUpdate.preferredModels.mainModel =
            newPreferences.mainModel
        }

        if (newPreferences.programmerModel) {
          userPreferencesUpdate.preferredModels.programmerModel =
            newPreferences.programmerModel
        }

        if (newPreferences.imageGeneration?.model) {
          userPreferencesUpdate.preferredModels.imageModel =
            newPreferences.imageGeneration.model
        }

        if (newPreferences.imageGeneration?.size?.wh) {
          userPreferencesUpdate.preferredModels.imageModelSize =
            newPreferences.imageGeneration.size.wh
        }
      }

      // Add tools updates if any
      if (newPreferences.tools) {
        userPreferencesUpdate.tools = newPreferences.tools
      }

      // Add memory updates if any
      if (newPreferences.memory) {
        userPreferencesUpdate.memory = newPreferences.memory
      }

      console.log("API update payload:", userPreferencesUpdate)

      // Update backend if there's anything to update
      let updatedUser: User | null = null
      if (Object.keys(userPreferencesUpdate).length > 0) {
        const result = await updateUserPreferences(
          user.uid,
          userPreferencesUpdate
        )
        if (result instanceof Error) {
          throw result
        }
        updatedUser = result
        console.log("Updated user from API:", updatedUser)
      }

      return { updatedPreferences, updatedUser }
    },
    onSuccess: (data) => {
      // Update user data directly if we got it from the API
      if (data.updatedUser) {
        console.log("Updating user cache with:", data.updatedUser)
        queryClient.setQueryData(["user"], data.updatedUser)
      }
    },
    onError: (error) => {
      console.error("Preference update error:", error)
      if (error instanceof Error) {
        toast.error(`Failed to update preferences: ${error.message}`)
      } else {
        toast.error("Failed to update preferences")
      }
    },
  })

  return {
    preferences: preferences.data,
    updatePreferences: mutation.mutate,
    isLoading: isUserLoading || preferences.isLoading,
    isPending: mutation.isPending,
  }
}
