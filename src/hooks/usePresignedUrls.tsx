import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { presignURL } from "@/api/bucket";
import { Result } from "@/types/common";
import { IMAGE_PLACEHOLDER_IMAGE } from "@/constants";

export type PresignedUrlContext = {
  getPresignedUrl: (originalUrl: string) => Promise<Result<string>>;
  getCachedUrl: (originalUrl: string) => Result<string | undefined>;
  clearCache: () => void;
};

const PresignedUrlContext = createContext<PresignedUrlContext | undefined>(
  undefined
);

/**
 * Hook for managing presigned URLs.
 */
export function usePresignedUrls(): PresignedUrlContext {
  const context = useContext(PresignedUrlContext);
  if (context === undefined) {
    throw new Error(
      "usePresignedUrls must be used within a PresignedUrlProvider"
    );
  }
  return context;
}

/**
 * Provider component for managing presigned URLs.
 */
export function PresignedUrlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  async function fetchPresignedUrl(
    originalUrl: string
  ): Promise<Result<string>> {
    try {
      const presignedUrl = await presignURL(originalUrl);
      if (presignedUrl.err) {
        return { err: `Failed to get presigned URL: ${presignedUrl.err}` };
      }
      return { ok: presignedUrl.ok ?? IMAGE_PLACEHOLDER_IMAGE };
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      return {
        err: `Failed to get presigned URL: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      };
    }
  }

  function getPresignedUrl(originalUrl: string): Promise<Result<string>> {
    return queryClient.fetchQuery({
      queryKey: ["presignedUrl", originalUrl],
      queryFn: () => fetchPresignedUrl(originalUrl),
    });
  }

  function getCachedUrl(originalUrl: string): Result<string | undefined> {
    const cachedData = queryClient.getQueryData<Result<string>>([
      "presignedUrl",
      originalUrl,
    ]);
    return cachedData ?? { ok: undefined };
  }

  function clearCache() {
    queryClient.removeQueries({ queryKey: ["presignedUrl"] });
  }

  const value = {
    getPresignedUrl,
    getCachedUrl,
    clearCache,
  };

  return (
    <PresignedUrlContext.Provider value={value}>
      {children}
    </PresignedUrlContext.Provider>
  );
}
