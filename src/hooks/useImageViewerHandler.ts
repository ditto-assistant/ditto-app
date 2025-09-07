import { useImageViewer } from "./useImageViewer"
import { useModal } from "./useModal"

export function useImageViewerHandler() {
  const { setMediaUrl } = useImageViewer()
  const { createOpenHandler } = useModal()
  const openImageViewer = createOpenHandler("imageViewer")

  const handleImageClick = (src: string) => {
    setMediaUrl(src)
    // Small delay to ensure state is set before opening modal
    setTimeout(() => {
      try {
        openImageViewer()
      } catch (error) {
        console.error("🖼️ [ImageViewerHandler] Error opening modal:", error)
      }
    }, 10)
  }

  return { handleImageClick }
}
