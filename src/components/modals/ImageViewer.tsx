import { useState, useRef, useEffect } from "react"
import { useImageViewer } from "@/hooks/useImageViewer"
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import Modal from "@/components/modals/Modal"
import { HapticPattern, triggerHaptic } from "@/lib/haptics"
import { Button } from "@/components/ui/button"
import "./ImageViewer.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

// Configure PDF.js worker - use local worker for PWA compatibility
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString()

type MediaType = "image" | "pdf" | "audio" | "video"

interface MediaViewerProps {
  url: string
  type: MediaType
  filename?: string
}

export default function ImageViewer() {
  const { mediaUrl } = useImageViewer()

  // Determine media type from URL
  const getMediaType = (url: string): MediaType => {
    if (url.toLowerCase().includes(".pdf")) return "pdf"
    if (url.toLowerCase().match(/\.(mp3|wav|ogg|flac|m4a)$/)) return "audio"
    if (url.toLowerCase().match(/\.(mp4|webm|avi)$/)) return "video"
    return "image"
  }

  const mediaType = getMediaType(mediaUrl)

  return (
    <MediaViewer
      url={mediaUrl}
      type={mediaType}
      filename={(() => {
        const baseFilename = mediaUrl.split("/").pop()?.split("?")[0] || "file"
        // Strip timestamp prefix (everything before first underscore for uploaded files)
        const parts = baseFilename.split("_")
        if (parts.length > 1 && /^\d{19}$/.test(parts[0])) {
          // Check if first part is a 19-digit timestamp
          return parts.slice(1).join("_")
        }
        return baseFilename
      })()}
    />
  )
}

function MediaViewer({ url, type, filename }: MediaViewerProps) {
  const [controlsVisible, setControlsVisible] = useState(true)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)

  const imageRef = useRef<HTMLImageElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom and position when media changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setPageNumber(1)
    setNumPages(0)
  }, [url])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || type !== "audio") return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [type, url])

  const handleDownload = () => {
    triggerHaptic(HapticPattern.Medium)
    window.open(url, "_blank")
  }

  const toggleControls = (e: React.MouseEvent) => {
    if (isDragging) return // Don't toggle controls if we're dragging

    // Check if click was on a control button
    const target = e.target as HTMLElement
    if (
      target.closest(".media-viewer-controls") ||
      target.closest(".media-control-button")
    ) {
      return // Don't toggle if clicking on controls
    }

    e.stopPropagation()
    triggerHaptic(HapticPattern.Light)
    setControlsVisible((prev) => !prev)
  }

  // Audio controls
  const handlePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  // PDF event handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset
      return Math.min(Math.max(newPage, 1), numPages)
    })
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

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

  const renderMediaContent = () => {
    switch (type) {
      case "pdf":
        return (
          <div className="pdf-container">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              className="media-viewer-content pdf-viewer"
              loading={
                <div className="pdf-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading PDF...</p>
                </div>
              }
              error={
                <div className="pdf-error">
                  <p>Failed to load PDF</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pdf-download-link"
                  >
                    Download PDF
                  </a>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={
                  containerRef.current?.clientWidth
                    ? Math.min(containerRef.current.clientWidth - 40, 800)
                    : 800
                }
                className="pdf-page"
                loading={
                  <div className="page-loading">
                    <div className="loading-spinner"></div>
                  </div>
                }
              />
            </Document>
            {numPages > 1 && (
              <div className="pdf-controls">
                <button
                  className="media-control-button pdf-nav"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerHaptic(HapticPattern.Light)
                    previousPage()
                  }}
                  disabled={pageNumber <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="pdf-page-info">
                  Page {pageNumber} of {numPages}
                </span>
                <button
                  className="media-control-button pdf-nav"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerHaptic(HapticPattern.Light)
                    nextPage()
                  }}
                  disabled={pageNumber >= numPages}
                  title="Next Page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )

      case "audio":
        return (
          <div className="audio-player-container">
            <audio
              ref={audioRef}
              src={url}
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div className="audio-player-controls">
              <button
                className="media-control-button play-pause"
                onClick={handlePlayPause}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>

              <div className="audio-progress-container">
                <span className="audio-time">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={handleSeek}
                  className="audio-progress"
                />
                <span className="audio-time">{formatTime(duration)}</span>
              </div>

              <div className="audio-info">
                <Volume2 size={16} />
                <span>{filename}</span>
              </div>
            </div>
          </div>
        )

      case "video":
        return (
          <video
            src={url}
            controls
            className="media-viewer-content video-player"
            preload="metadata"
          />
        )

      default: // image
        return (
          <>
            <img
              ref={imageRef}
              src={url}
              alt="Media preview"
              className="media-viewer-content image-viewer-img"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease",
                maxWidth: scale <= 1 ? "100%" : "none",
                maxHeight: scale <= 1 ? "100%" : "none",
              }}
            />
            {controlsVisible && (
              <div className="media-viewer-controls">
                <button
                  className="media-control-button zoom-in"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleZoomIn()
                  }}
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className="media-control-button zoom-out"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleZoomOut()
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  className="media-control-button reset"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReset()
                  }}
                  title="Reset View"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            )}
          </>
        )
    }
  }

  const canZoom = type === "image"
  const showZoomControls = canZoom && controlsVisible
  const isPdf = type === "pdf"

  return (
    <Modal
      id="imageViewer"
      title={`${type.charAt(0).toUpperCase() + type.slice(1)} Preview`}
      headerRightContent={HeaderDownloadButton}
    >
      <div
        className={`media-viewer-container ${type} ${scale > 1 ? "is-zoomed" : ""}`}
        ref={containerRef}
        onWheel={canZoom ? handleWheel : undefined}
        onMouseDown={canZoom ? handleMouseDown : undefined}
        onMouseMove={canZoom ? handleMouseMove : undefined}
        onMouseUp={canZoom ? handleDragEnd : undefined}
        onMouseLeave={canZoom ? handleDragEnd : undefined}
        onTouchStart={canZoom ? handleTouchStart : undefined}
        onTouchMove={canZoom ? handleTouchMove : undefined}
        onTouchEnd={canZoom ? handleDragEnd : undefined}
        onClick={isPdf ? undefined : toggleControls}
        onDoubleClick={canZoom ? handleDoubleClick : undefined}
        style={{
          cursor: canZoom
            ? isDragging
              ? "grabbing"
              : scale > 1
                ? "grab"
                : "default"
            : "default",
        }}
      >
        {renderMediaContent()}

        {showZoomControls && (
          <div className="media-viewer-controls">
            <button
              className="media-control-button zoom-in"
              onClick={(e) => {
                e.stopPropagation()
                handleZoomIn()
              }}
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              className="media-control-button zoom-out"
              onClick={(e) => {
                e.stopPropagation()
                handleZoomOut()
              }}
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              className="media-control-button reset"
              onClick={(e) => {
                e.stopPropagation()
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
