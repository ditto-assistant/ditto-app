import { useRef, useState } from "react"
import { FlipVertical } from "lucide-react"
import {
  HapticPattern,
  VibrationPatterns,
  triggerHaptic,
} from "@/utils/haptics"

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (imageDataURL: string) => void
}

export default function CameraModal({
  isOpen,
  onClose,
  onCapture,
}: CameraModalProps) {
  const [isFrontCamera, setIsFrontCamera] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = (useFrontCamera: boolean) => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment" },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err)
      })
  }

  const stopCameraFeed = () => {
    const stream = videoRef.current?.srcObject as MediaStream
    if (stream) {
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }

  const handleSnap = () => {
    triggerHaptic(VibrationPatterns.Success)
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d")
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)
        const imageDataURL = canvasRef.current.toDataURL("image/png")
        onCapture(imageDataURL)
        onClose()
      }
    }
  }

  const toggleCamera = () => {
    triggerHaptic(HapticPattern.Medium)
    setIsFrontCamera(!isFrontCamera)
    stopCameraFeed()
    startCamera(!isFrontCamera)
  }

  const handleClose = () => {
    triggerHaptic(HapticPattern.Light)
    onClose()
  }

  // Start camera when component mounts if it's open
  if (isOpen) {
    startCamera(isFrontCamera)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-card rounded-lg overflow-hidden max-w-[90%] max-h-[90%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          autoPlay
          className="w-full object-contain max-h-[calc(90vh-100px)]"
        ></video>
        <div className="flex justify-around items-center w-full p-4 bg-muted">
          <button
            onClick={toggleCamera}
            className="p-2 rounded-full bg-background/10 text-foreground hover:bg-background/20 transition"
          >
            <FlipVertical className="h-5 w-5" />
          </button>
          <button
            onClick={handleSnap}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
          >
            Snap
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-full bg-background/20 text-foreground hover:bg-background/30 transition"
          >
            Close
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  )
}
