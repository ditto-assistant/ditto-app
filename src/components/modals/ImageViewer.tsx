import { useState, useRef, useEffect } from "react"
import { useImageViewer } from "@/hooks/useImageViewer"
import { Download, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import Modal from "@/components/modals/Modal"
import { HapticPattern, triggerHaptic } from "@/lib/haptics"
import { Button } from "@/components/ui/button"
import "./ImageViewer.css"

export default function ImageViewer() {
  const { imageUrl } = useImageViewer()
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom and position when image changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [imageUrl])

  const handleDownload = () => {
    triggerHaptic(HapticPattern.Medium)
    window.open(imageUrl, "_blank")
  }

  const toggleControls = (e: React.MouseEvent) => {
    if (isDragging) return // Don't toggle controls if we're dragging

    // Check if click was on a control button
    const target = e.target as HTMLElement
    if (
      target.closest(".image-viewer-controls") ||
      target.closest(".image-control-button")
    ) {
      return // Don't toggle if clicking on controls
    }

    e.stopPropagation()
    triggerHaptic(HapticPattern.Light)
    setControlsVisible((prev) => !prev)
  }

  // Download button for the header
  const HeaderDownloadButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDownload}
      className="text-muted-foreground hover:text-foreground"
      aria-label="Download image"
    >
      <Download size={18} />
    </Button>
  )

  const handleZoomIn = () => {
    triggerHaptic(HapticPattern.Light)
    setScale((prevScale) => Math.min(prevScale + 0.25, 5)) // Max zoom 5x
  }

  const handleZoomOut = () => {
    triggerHaptic(HapticPattern.Light)
    setScale((prevScale) => Math.max(prevScale - 0.25, 0.5)) // Min zoom 0.5x
  }

  const handleReset = () => {
    triggerHaptic(HapticPattern.Medium)
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  // Pinch zoom handling
  const handleWheel = (e: React.WheelEvent) => {
    // Only handle pinch zoom (ctrl + wheel) to be desktop-friendly
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY * -0.01
      const newScale = Math.min(Math.max(scale + delta, 0.5), 5)
      setScale(newScale)
    }
  }

  // Touch event handling for pinch zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let initialDistance = 0
    let initialScale = 1

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialScale = scale
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()

        // Calculate new distance between touch points
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )

        // Calculate new scale based on distance change
        const pinchScale = currentDistance / initialDistance
        const newScale = Math.min(Math.max(initialScale * pinchScale, 0.5), 5)

        setScale(newScale)
      }
    }

    container.addEventListener("touchstart", handleTouchStart)
    container.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
    }
  }, [scale])

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }
      setPosition(newPosition)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault()
      const newPosition = {
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      }
      setPosition(newPosition)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Double-click to reset zoom
  const handleDoubleClick = () => {
    if (scale !== 1) {
      handleReset()
    } else {
      handleZoomIn() // If already at default zoom, zoom in instead
    }
  }

  return (
    <Modal
      id="imageViewer"
      title="Preview"
      headerRightContent={HeaderDownloadButton}
    >
      <div
        className={`image-viewer-container ${scale > 1 ? "is-zoomed" : ""}`}
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleDragEnd}
        onClick={toggleControls}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Image preview"
          className="image-viewer-img"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease",
            maxWidth: scale <= 1 ? "100%" : "none",
            maxHeight: scale <= 1 ? "100%" : "none",
          }}
        />
        {controlsVisible && (
          <div className="image-viewer-controls">
            <button
              className="image-control-button zoom-in"
              onClick={(e) => {
                e.stopPropagation() // Prevent event propagation
                handleZoomIn()
              }}
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              className="image-control-button zoom-out"
              onClick={(e) => {
                e.stopPropagation() // Prevent event propagation
                handleZoomOut()
              }}
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              className="image-control-button reset"
              onClick={(e) => {
                e.stopPropagation() // Prevent event propagation
                handleReset()
              }}
              title="Reset View"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
