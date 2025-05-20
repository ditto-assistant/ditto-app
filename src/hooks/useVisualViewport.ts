import { useEffect, useState } from "react"

interface ViewportState {
  height: number
  width: number
  scale: number
  offsetTop: number
  offsetLeft: number
  keyboardVisible: boolean
}

/**
 * Hook to track visual viewport changes, especially for detecting when
 * the virtual keyboard is shown on mobile devices.
 *
 * This is particularly useful for Android where the keyboard appearance
 * shrinks the visual viewport but not the layout viewport.
 */
export function useVisualViewport() {
  const [viewport, setViewport] = useState<ViewportState>({
    height: window.innerHeight,
    width: window.innerWidth,
    scale: 1,
    offsetTop: 0,
    offsetLeft: 0,
    keyboardVisible: false,
  })

  useEffect(() => {
    // Check if visualViewport API is available (modern browsers)
    if (window.visualViewport) {
      const handleResize = () => {
        // Consider keyboard visible if visual viewport is significantly smaller than inner height
        // The 150px threshold accounts for various keyboard heights
        const keyboardVisible =
          window.innerHeight > (window.visualViewport?.height || 0) + 150

        setViewport({
          height: window.visualViewport?.height || 0,
          width: window.visualViewport?.width || 0,
          scale: window.visualViewport?.scale || 1,
          offsetTop: window.visualViewport?.offsetTop || 0,
          offsetLeft: window.visualViewport?.offsetLeft || 0,
          keyboardVisible,
        })
      }

      // Subscribe to visualViewport events
      window.visualViewport.addEventListener("resize", handleResize)
      window.visualViewport.addEventListener("scroll", handleResize)

      // Initial measurement
      handleResize()

      return () => {
        // Clean up event listeners
        window.visualViewport?.removeEventListener("resize", handleResize)
        window.visualViewport?.removeEventListener("scroll", handleResize)
      }
    } else {
      // Fallback for browsers without visualViewport API
      const handleResize = () => {
        // This is a less accurate fallback method
        setViewport((prev) => ({
          ...prev,
          height: window.innerHeight,
          width: window.innerWidth,
        }))
      }

      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  return viewport
}
