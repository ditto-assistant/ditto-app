import { createContext, useContext, useState, ReactNode } from "react"

interface MediaViewerContextType {
  mediaUrl: string
  setMediaUrl: (url: string) => void
}

const MediaViewerContext = createContext<MediaViewerContextType | null>(null)

export function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [mediaUrl, setMediaUrl] = useState("")
  return (
    <MediaViewerContext.Provider value={{ mediaUrl, setMediaUrl }}>
      {children}
    </MediaViewerContext.Provider>
  )
}

// Legacy support - keep the old name for backward compatibility
export const ImageViewerProvider = MediaViewerProvider

export function useMediaViewer() {
  const context = useContext(MediaViewerContext)
  if (!context) {
    throw new Error("useMediaViewer must be used within a MediaViewerProvider")
  }
  return context
}

// Legacy support - keep the old name for backward compatibility
export const useImageViewer = useMediaViewer
