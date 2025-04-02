import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import {
  refreshUserSubscription,
  RefreshSubscriptionResponse,
} from "@/api/refreshSubscription";

export function useRefreshSubscription() {
  const queryClient = useQueryClient();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const DEBOUNCE_TIME = 15000; // 15 seconds
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const mutation = useMutation<RefreshSubscriptionResponse, Error, string>({
    mutationFn: async (userId: string) => {
      const result = await refreshUserSubscription(userId);
      if (result.err) {
        throw new Error(result.err);
      }
      if (!result.ok) {
        throw new Error("No data returned");
      }
      return result.ok;
    },
    onSuccess: () => {
      // Invalidate the user query to refetch user data with updated subscription
      queryClient.invalidateQueries({ queryKey: ["user"] });

      // Set debounce state
      setIsDebouncing(true);

      // Set a timeout to reset the debounce state after the specified time
      timeoutRef.current = setTimeout(() => {
        setIsDebouncing(false);
      }, DEBOUNCE_TIME);
    },
  });

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...mutation,
    isDisabled: isDebouncing || mutation.isPending,
    debounceTimeMs: DEBOUNCE_TIME,
  };
}
