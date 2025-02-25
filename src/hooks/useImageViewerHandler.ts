import { useImageViewer } from "./useImageViewer";
import { useModal } from "./useModal";
import { usePresignedUrls } from "./usePresignedUrls";

/**
 * Custom hook that provides image viewing functionality with optional caching
 * @param {boolean} cacheRequired - Whether to use image caching (default: false)
 * @returns {Object} Object containing handleImageClick function
 */
export function useImageViewerHandler(cacheRequired = false) {
  const { setImageUrl } = useImageViewer();
  const { createOpenHandler } = useModal();
  const { getCachedUrl } = usePresignedUrls();
  const openImageViewer = createOpenHandler("imageViewer");

  const handleImageClick = (src: string) => {
    // Only use caching if explicitly required
    if (cacheRequired && getCachedUrl) {
      const cachedUrl = getCachedUrl(src);
      const imageUrl = cachedUrl?.ok ? cachedUrl.ok : src;
      setImageUrl(imageUrl);
    } else {
      setImageUrl(src);
    }
    openImageViewer();
  };

  return { handleImageClick };
}
