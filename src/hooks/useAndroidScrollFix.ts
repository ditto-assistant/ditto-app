import { useEffect, RefObject } from "react"
import { usePlatform } from "./usePlatform"
import { useVisualViewport } from "./useVisualViewport"

/**
 * A hook that helps fix scrolling issues on Android devices, particularly
 * when the virtual keyboard is open and a textarea needs to be scrollable.
 *
 * This approach focuses on making both the textarea and chat feed scrollable
 * without interfering with each other.
 */
export function useAndroidScrollFix(
  textareaRef: RefObject<HTMLTextAreaElement>,
  canScroll: boolean
) {
  const { isAndroid } = usePlatform()
  const viewport = useVisualViewport()

  useEffect(() => {
    if (!isAndroid || !textareaRef.current) return

    // This variable tracks if we're currently scrolling the textarea
    let isScrollingTextarea = false

    const handleTouchStart = (e: TouchEvent) => {
      if (!viewport.keyboardVisible) return

      // Track when a touch starts in the textarea
      isScrollingTextarea = e.target === textareaRef.current
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!viewport.keyboardVisible || !canScroll) return
      if (e.target !== textareaRef.current) return

      // Note we're not stopping propagation here since we want both
      // the textarea and chat feed to be able to scroll
    }

    const handleTouchEnd = () => {
      if (!viewport.keyboardVisible) return

      // Reset the flag
      isScrollingTextarea = false
    }

    // Add event listeners directly to the textarea
    const textarea = textareaRef.current
    textarea.addEventListener("touchstart", handleTouchStart, { passive: true })
    textarea.addEventListener("touchmove", handleTouchMove, { passive: true })
    textarea.addEventListener("touchend", handleTouchEnd, { passive: true })

    // Optimize the textarea for Android scrolling
    if (viewport.keyboardVisible) {
      textarea.style.overscrollBehavior = "contain"
      textarea.style.WebkitOverflowScrolling = "touch"
    }

    return () => {
      // Clean up event listeners
      textarea.removeEventListener("touchstart", handleTouchStart)
      textarea.removeEventListener("touchmove", handleTouchMove)
      textarea.removeEventListener("touchend", handleTouchEnd)

      // Reset styles
      textarea.style.overscrollBehavior = ""
      textarea.style.WebkitOverflowScrolling = ""
    }
  }, [isAndroid, viewport.keyboardVisible, canScroll, textareaRef])
}
