import { createContext, useContext, useState } from "react";
import { presignURL } from "@/api/bucket";
import { Result } from "@/types/common";
import { IMAGE_PLACEHOLDER_IMAGE } from "@/constants";

export type PresignedUrlContext = {
  getPresignedUrl: (originalUrl: string) => Promise<Result<string>>;
  getCachedUrl: (originalUrl: string) => Result<string | undefined>;
  addToCache: (originalUrl: string, presignedUrl: string) => void;
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
  const [urlCache, setUrlCache] = useState(new Map<string, string>());
  const [failedUrls, setFailedUrls] = useState(new Set());

  // Get a presigned URL for an image, using cache if available.
  async function getPresignedUrl(originalUrl: string): Promise<Result<string>> {
    if (urlCache.has(originalUrl)) {
      return { ok: urlCache.get(originalUrl) };
    }

    function makeError(err: string) {
      return {
        err: `Failed to get presigned URL: ${err}; originalUrl: ${originalUrl}`,
      };
    }
    try {
      const presignedUrl = await presignURL(originalUrl);
      if (presignedUrl.err) {
        setFailedUrls((prev) => prev.add(originalUrl));
        return makeError(presignedUrl.err);
      }
      setUrlCache((prev) =>
        new Map(prev).set(
          originalUrl,
          presignedUrl.ok ?? IMAGE_PLACEHOLDER_IMAGE
        )
      );
      return presignedUrl;
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      return makeError(
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }

  function getCachedUrl(originalUrl: string): Result<string | undefined> {
    if (failedUrls.has(originalUrl)) {
      return { err: "Failed to get presigned URL" };
    }
    const cachedUrl = urlCache.get(originalUrl);
    if (cachedUrl) {
      return { ok: cachedUrl };
    }
    return { ok: undefined };
  }

  function addToCache(originalUrl: string, presignedUrl: string) {
    setUrlCache((prev) => new Map(prev).set(originalUrl, presignedUrl));
  }

  function clearCache() {
    setUrlCache(new Map());
  }

  const value = {
    getPresignedUrl,
    getCachedUrl,
    addToCache,
    clearCache,
  };

  return (
    <PresignedUrlContext.Provider value={value}>
      {children}
    </PresignedUrlContext.Provider>
  );
}
