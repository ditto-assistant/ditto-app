import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listKeys } from "@/api/encryption";

export function useEncryptionKeys() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["encryptionKeys", user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error("No user");
      const { ok, err } = await listKeys();
      if (err) {
        throw new Error(err);
      }
      if (!ok) {
        throw new Error("Failed to fetch encryption keys");
      }
      console.log("Encryption keys fetched", ok.keys);
      return ok.keys;
    },
    enabled: !!user,
    // Keep data fresher with shorter stale time
    staleTime: 10 * 1000, // 10 seconds
    // Add retries for more resilience
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Always refetch on window focus to ensure we have the latest key data
    refetchOnWindowFocus: true,
  });
}
