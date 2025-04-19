import { useQuery } from "@tanstack/react-query"
import { DEFAULT_USER_AVATAR } from "@/constants"

// Check if the Workbox service worker API is available
const hasServiceWorker = "serviceWorker" in navigator && "caches" in window

// Create a global cache for avatars to avoid repeated requests
const avatarCache = new Map<string, string>()

/**
 * Custom hook to fetch and cache user avatars with built-in error handling.
 *
 * @param photoURL The URL to the user's photo
 * @param fallbackAvatar The avatar to show if loading fails
 * @returns A cached avatar URL that won't trigger 429 errors
 */
// Helper to preload avatars in the background
export const preloadAvatar = (photoURL: string | null | undefined) => {
  if (!photoURL) return

  // Only preload if we don't have it cached already
  if (!avatarCache.has(photoURL)) {
    // Create a hidden image element to trigger loading
    const img = new Image()
    img.src = photoURL
    img.crossOrigin = "anonymous"

    // Add to cache on successful load
    img.onload = () => {
      avatarCache.set(photoURL, photoURL)

      // Store in service worker cache too
      if (hasServiceWorker) {
        caches
          .open("images")
          .then((cache) => {
            fetch(photoURL, { method: "GET" })
              .then((response) => cache.put(photoURL, response))
              .catch(() => {})
          })
          .catch(() => {})
      }
    }
  }
}

export function useUserAvatar(
  photoURL: string | null | undefined,
  fallbackAvatar = DEFAULT_USER_AVATAR
): string | null {
  // Use React Query to efficiently fetch and cache the image
  const { data: avatarUrl, isError } = useQuery({
    queryKey: ["avatar", photoURL],
    queryFn: async (): Promise<string | null> => {
      // Return from cache if available
      if (photoURL && avatarCache.has(photoURL)) {
        return avatarCache.get(photoURL) ?? null
      }

      // If no photo URL, return the fallback
      if (!photoURL) {
        return fallbackAvatar
      }

      try {
        // First try to get the image from the service worker cache if available
        if (hasServiceWorker) {
          try {
            // Use the workbox cache if available
            const cache = await caches.open("images")
            const cachedResponse = await cache.match(photoURL)

            if (cachedResponse && cachedResponse.ok) {
              avatarCache.set(photoURL, photoURL)
              return photoURL
            }
          } catch (cacheError) {
            // Silently continue if service worker cache fails
            console.debug("Cache lookup failed:", cacheError)
          }
        }

        // Create an image object to test if the URL loads successfully
        return await new Promise<string>((resolve, reject) => {
          const img = new Image()

          // Set a timeout to prevent long-hanging requests
          const timeout = setTimeout(() => {
            reject(new Error("Avatar load timeout"))
          }, 5000)

          // Set up handlers before setting src to avoid race conditions
          img.onload = () => {
            clearTimeout(timeout)
            avatarCache.set(photoURL, photoURL)

            // Store in service worker cache for future requests
            if (hasServiceWorker) {
              caches.open("images").then((cache) => {
                // Create a response object to store in the cache
                fetch(photoURL, {
                  method: "GET",
                  headers: {
                    "Cache-Control": "max-age=86400", // 24 hours
                  },
                })
                  .then((response) => cache.put(photoURL, response))
                  .catch((err) => console.debug("Failed to cache avatar:", err))
              })
            }

            resolve(photoURL)
          }

          img.onerror = () => {
            clearTimeout(timeout)
            reject(new Error("Failed to load avatar"))
          }

          // Start loading the image
          img.src = photoURL

          // Immediately set crossOrigin to anonymous for CORS images
          img.crossOrigin = "anonymous"
        })
      } catch (error) {
        console.warn("Avatar failed to load:", error)
        return fallbackAvatar
      }
    },
    // Critical settings to prevent over-fetching
    staleTime: 1000 * 60 * 60, // Consider data fresh for 1 hour
    retry: false, // Don't retry failed requests to avoid rate limits
    refetchOnWindowFocus: false, // Don't refetch when window focuses
    refetchOnMount: false, // Don't refetch when component mounts
  })

  // Always return a valid avatar URL
  return isError ? fallbackAvatar : (avatarUrl ?? fallbackAvatar)
}
