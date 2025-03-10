import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listKeys } from "@/api/encryption";

export function useEncryptionKeys() {
  const { user } = useAuth();

  const query = useQuery({
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
      return ok.keys;
    },
    enabled: !!user,
  });

  return {
    ...query,
    encryptionKeys: query.data,
    activeKey: query.data ? query.data.find((key) => key.isActive) : undefined,
  };
}
