import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  updateUserPreferences, 
  ErrorPaymentRequired, 
  UserPreferencesUpdate,
  UpdateUserPreferencesResponse
} from "@/api/updateUserPreferences";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Hook for updating user preferences
 * @returns Mutation object for updating user preferences
 */
export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<UpdateUserPreferencesResponse, Error, UserPreferencesUpdate>({
    mutationFn: async (preferences: UserPreferencesUpdate) => {
      if (!user?.uid) throw new Error("User not authenticated");
      
      const result = await updateUserPreferences(user.uid, preferences);
      
      // Check if result is an Error and throw it to trigger onError
      if (result instanceof Error) {
        throw result;
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success("Preferences updated successfully");
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: (error) => {
      // Special handling for payment errors
      if (error === ErrorPaymentRequired) {
        toast.error("Please add more tokens to your account");
        return;
      }
      
      // Generic error handling
      toast.error(error.message || "An unknown error occurred");
    }
  });
}