import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getUser, User } from "@/api/getUser"
import { useAuth } from "./useAuth"
import {
  updateUserPreferences,
  ErrorPaymentRequired,
  UserPreferencesUpdate,
} from "@/api/userPreferences"

/**
 * Hook to fetch user profile data
 */
export function useUser() {
  return useQuery<User, Error>({
    queryKey: ["user"],
    queryFn: async () => {
      const result = await getUser()
      if (result.err) {
        throw new Error(result.err)
      }
      if (!result.ok) {
        throw new Error("No data returned")
      }
      return result.ok
    },
  })
}

/**
 * Hook for updating user preferences
 * @returns Mutation object for updating user preferences
 */
export function useUserPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<User, Error, UserPreferencesUpdate>({
    mutationFn: async (preferences: UserPreferencesUpdate) => {
      if (!user?.uid) throw new Error("User not authenticated")

      const result = await updateUserPreferences(user.uid, preferences)

      // Check if result is an Error and throw it to trigger onError
      if (result instanceof Error) {
        throw result
      }

      return result
    },
    onSuccess: (updatedUser) => {
      toast.success("Preferences updated successfully")
      // Directly update user data in cache instead of invalidating
      queryClient.setQueryData(["user"], updatedUser)
    },
    onError: (error) => {
      // Special handling for payment errors
      if (error === ErrorPaymentRequired) {
        toast.error("Please add more tokens to your account")
        return
      }

      // Generic error handling
      toast.error(error.message || "An unknown error occurred")
    },
  })
}
