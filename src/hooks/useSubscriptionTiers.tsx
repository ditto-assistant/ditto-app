import { useQuery } from "@tanstack/react-query"
import { getSubscriptionTiers, SubscriptionResponse } from "@/api/subscriptions"

export function useSubscriptionTiers() {
  return useQuery<SubscriptionResponse, Error>({
    queryKey: ["subscriptionTiers"],
    queryFn: async () => {
      const result = await getSubscriptionTiers()
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
