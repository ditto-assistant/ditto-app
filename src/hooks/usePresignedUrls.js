import { createContext, useContext, useState } from "react";
import { presignURL } from "../api/bucket";

const PresignedUrlContext = createContext();

/**
 * Custom hook to manage presigned URLs for images.
 *
 * @returns {{
 *   getPresignedUrl: (originalUrl: string) => Promise<string>,
 *   getCachedUrl: (originalUrl: string) => string | undefined,
 *   addToCache: (originalUrl: string, presignedUrl: string) => void,
 *   clearCache: () => void
 * }}
 */
export function usePresignedUrls() {
  const context = useContext(PresignedUrlContext);
  if (context === undefined) {
    throw new Error(
      "usePresignedUrls must be used within a PresignedUrlProvider",
    );
  }
  return context;
}

/**
 * Provider component for managing presigned URLs.
 */
export function PresignedUrlProvider({ children }) {
  const [urlCache, setUrlCache] = useState(new Map());

  /**
   * Get a presigned URL for an image, using cache if available.
   *
   * @param {string} originalUrl - The original URL of the image
   * @returns {Promise<string>} The presigned URL
   */
  const getPresignedUrl = async (originalUrl) => {
    if (urlCache.has(originalUrl)) {
      return urlCache.get(originalUrl);
    }

    try {
      const presignedUrl = await presignURL(originalUrl);
      if (presignedUrl) {
        setUrlCache((prev) => new Map(prev).set(originalUrl, presignedUrl));
        return presignedUrl;
      }
      return originalUrl;
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      return originalUrl;
    }
  };

  /**
   * Get a cached presigned URL if available.
   *
   * @param {string} originalUrl - The original URL of the image
   * @returns {string | undefined} The cached presigned URL or undefined if not cached
   */
  const getCachedUrl = (originalUrl) => {
    return urlCache.get(originalUrl);
  };

  /**
   * Add a URL to the cache.
   *
   * @param {string} originalUrl - The original URL of the image
   * @param {string} presignedUrl - The presigned URL to cache
   */
  const addToCache = (originalUrl, presignedUrl) => {
    setUrlCache((prev) => new Map(prev).set(originalUrl, presignedUrl));
  };

  /**
   * Clear the URL cache.
   */
  const clearCache = () => {
    setUrlCache(new Map());
  };

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
