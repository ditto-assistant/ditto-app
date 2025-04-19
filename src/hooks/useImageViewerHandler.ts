import { useImageViewer } from "./useImageViewer"
import { useModal } from "./useModal"

export function useImageViewerHandler() {
  const { setImageUrl } = useImageViewer()
  const { createOpenHandler } = useModal()
  const openImageViewer = createOpenHandler("imageViewer")

  const handleImageClick = (src: string) => {
    setImageUrl(src)
    openImageViewer()
  }

  return { handleImageClick }
}
