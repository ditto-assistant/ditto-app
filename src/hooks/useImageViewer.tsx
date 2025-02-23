import { createContext, useContext, useState, ReactNode } from "react";
interface ImageViewerContextType {
  imageUrl: string;
  setImageUrl: (url: string) => void;
}

const ImageViewerContext = createContext<ImageViewerContextType | null>(null);

export function ImageViewerProvider({ children }: { children: ReactNode }) {
  const [imageUrl, setImageUrl] = useState("");
  return (
    <ImageViewerContext.Provider value={{ imageUrl, setImageUrl }}>
      {children}
    </ImageViewerContext.Provider>
  );
}

export function useImageViewer() {
  const context = useContext(ImageViewerContext);
  if (!context) {
    throw new Error(
      "useImageViewer must be used within an ImageViewerProvider"
    );
  }
  return context;
}
