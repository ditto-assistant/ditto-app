import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchTermsOfService,
  checkTOSAcceptanceStatus,
  acceptTermsOfService,
  TermsOfService,
  TOSAcceptanceStatus,
} from "@/api/tos"

interface UseTermsOfServiceResult {
  tos: TermsOfService | null
  status: TOSAcceptanceStatus | null
  tosLoading: boolean
  statusLoading: boolean
  error: string | null
  acceptTOS: (tosId: number) => Promise<boolean>
}

/**
 * Hook to fetch and manage the Terms of Service from the API
 * @param userId - Optional user ID to check acceptance status
 * @param version - Optional version to fetch a specific TOS version
 * @returns Result containing tos data, loading state, error, and management functions
 */
export function useTermsOfService(
  userId?: string,
  version?: string
): UseTermsOfServiceResult {
  const queryClient = useQueryClient()

  // Query to fetch the Terms of Service
  const {
    data: tosData,
    isLoading: tosLoading,
    error: tosError,
  } = useQuery({
    queryKey: ["termsOfService", version],
    queryFn: async () => {
      const result = await fetchTermsOfService(version)
      if (result instanceof Error) {
        throw result
      }
      return result
    },
  })

  // Query to check TOS acceptance status
  const {
    data: statusData,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ["tosStatus", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required to check status")

      const result = await checkTOSAcceptanceStatus(userId)
      if (result instanceof Error) {
        throw result
      }
      return result
    },
    enabled: !!userId,
  })

  // Mutation to accept the Terms of Service
  const acceptMutation = useMutation({
    mutationFn: async ({ uid, tosId }: { uid: string; tosId: number }) => {
      const result = await acceptTermsOfService(uid, tosId)
      if (result instanceof Error) {
        throw result
      }
      return result.success
    },
    onSuccess: () => {
      // Invalidate and refetch the status
      queryClient.invalidateQueries({ queryKey: ["tosStatus", userId] })
    },
  })

  // Helper function to accept TOS
  const handleAcceptTOS = async (tosId: number): Promise<boolean> => {
    if (!userId) return false

    try {
      return await acceptMutation.mutateAsync({ uid: userId, tosId })
    } catch (error) {
      return false
    }
  }

  // Safe access to data with null fallback for undefined values
  const tos = tosData || null
  const status = statusData || null

  return {
    tos,
    status,
    tosLoading,
    statusLoading,
    error: tosError?.message || statusError?.message || null,
    acceptTOS: handleAcceptTOS,
  }
}
