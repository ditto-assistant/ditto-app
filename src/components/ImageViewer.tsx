import { useState } from "react"
import { useImageViewer } from "@/hooks/useImageViewer"
import { Download } from "lucide-react"
import Modal from "@/components/ui/modals/Modal"
import "./ImageViewer.css"

export default function ImageViewer() {
  const { imageUrl } = useImageViewer()
  const [controlsVisible, setControlsVisible] = useState(true)
  const handleDownload = () => {
    window.open(imageUrl, "_blank")
  }
  const toggleControls = (e: React.MouseEvent) => {
    e.stopPropagation()
    setControlsVisible((prev) => !prev)
  }

  return (
    <Modal id="imageViewer" title="Preview">
      <div className="image-viewer-container">
        <img
          src={imageUrl}
          alt="Full size"
          onClick={toggleControls}
          className="image-viewer-img"
        />
        {controlsVisible && (
          <div className="image-viewer-controls">
            <button
              className="image-control-button download"
              onClick={handleDownload}
              title="Download"
            >
              <Download />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
