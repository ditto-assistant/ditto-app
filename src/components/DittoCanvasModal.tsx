import { useEffect, useRef, useState } from "react"
import { IconButton } from "@mui/material"
import FullscreenIcon from "@mui/icons-material/Fullscreen"
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit"
import Modal from "@/components/ui/modals/Modal"
import { useModal } from "@/hooks/useModal"
import { useScripts } from "@/hooks/useScripts"
import "./DittoCanvasModal.css"
import { usePlatform } from "@/hooks/usePlatform"

export default function DittoCanvasModal() {
  const { createCloseHandler } = useModal()
  const closeModal = createCloseHandler("dittoCanvas")
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { isMobile } = usePlatform()
  const { selectedScript } = useScripts()

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setVH()
    window.addEventListener("resize", setVH)
    window.addEventListener("orientationchange", setVH)

    return () => {
      window.removeEventListener("resize", setVH)
      window.removeEventListener("orientationchange", setVH)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    const iframe = iframeRef.current
    if (!iframe) return

    if (!isFullscreen) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // If no script is selected, show an empty state
  if (!selectedScript) {
    return (
      <Modal id="dittoCanvas" title="No Script Selected">
        <div className="ditto-canvas-container">
          <div className="empty-state">
            <h2>No Script Selected</h2>
            <p>Please select a script to view in the canvas.</p>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal id="dittoCanvas" title={selectedScript.script}>
      <div className="ditto-canvas-container">
        {!isFullscreen && (
          <div className="ditto-canvas-header">
            <IconButton
              className="fullscreen-button"
              onClick={toggleFullscreen}
              aria-label="fullscreen"
            >
              <FullscreenIcon />
            </IconButton>
          </div>
        )}

        <div ref={iframeRef} className="iframe-container">
          <iframe
            title={selectedScript.script}
            srcDoc={selectedScript.contents}
            className="canvas-iframe"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {isFullscreen && isMobile && (
          <div className="fullscreen-mobile-nav">
            <IconButton className="close-button" onClick={closeModal}>
              <FullscreenExitIcon />
            </IconButton>
          </div>
        )}
      </div>
    </Modal>
  )
}
