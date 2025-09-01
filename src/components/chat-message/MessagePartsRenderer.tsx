import MarkdownRenderer from "../MarkdownRenderer"
import { ContentV2 } from "@/api/getMemories"
import { Wrench, Play, Volume2, FileText, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import { useState, useRef, useEffect } from "react"

interface MessagePartsRendererProps {
  parts: ContentV2[]
  keyPrefix: string
}

const MessagePartsRenderer: React.FC<MessagePartsRendererProps> = ({
  parts,
  keyPrefix,
}) => {
  const { handleImageClick } = useImageViewerHandler()

  const AudioPlayer = ({
    url,
    filename,
  }: {
    url: string
    filename: string
  }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
      const audio = audioRef.current
      if (!audio) return

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
    }, [url])

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

    return (
      <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/20">
        <audio ref={audioRef} src={url} preload="metadata" />
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          className="shrink-0"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium truncate">{filename}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  const renderPart = (part: ContentV2, index: number) => {
    const key = `${keyPrefix}-${index}`

    switch (part.type) {
      case "text":
        return <MarkdownRenderer key={key}>{part.content}</MarkdownRenderer>
      case "image":
        return (
          <img
            key={key}
            src={part.content}
            alt={`${keyPrefix} image`}
            className="rounded-md border border-border max-w-full"
            draggable={false}
          />
        )
      case "tool_call":
        if (!part.toolCall) return null
        const { name, args } = part.toolCall
        return (
          <div
            key={key}
            className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border border-border"
          >
            <Wrench size={16} className="mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Tool Call:
                </span>
                <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                  {name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )
      case "application/pdf":
        return (
          <div
            key={key}
            className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={(e) => {
              console.log(
                "📄 [MessagePartsRenderer] PDF clicked:",
                part.content
              )
              e.preventDefault()
              e.stopPropagation()
              handleImageClick(part.content)
              return false
            }}
          >
            <FileText size={20} className="text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">PDF Document</p>
              <p className="text-xs text-muted-foreground truncate">
                {part.originalFilename ||
                  part.content.split("/").pop()?.split("?")[0] ||
                  "document.pdf"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleImageClick(part.content)
              }}
              className="shrink-0"
            >
              View PDF
            </Button>
          </div>
        )
      case "audio/wav":
      case "audio/mp3":
        const filename =
          part.originalFilename ||
          part.content.split("/").pop()?.split("?")[0] ||
          `audio.${part.type.split("/")[1]}`
        return <AudioPlayer key={key} url={part.content} filename={filename} />
      default:
        return null
    }
  }

  return (
    <>
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
        }
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: hsl(var(--primary));
          cursor: pointer;
          border: 2px solid hsl(var(--background));
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.1);
        }
        .slider::-webkit-slider-track {
          background: hsl(var(--muted));
          height: 4px;
          border-radius: 2px;
        }
        .slider::-moz-range-track {
          background: hsl(var(--muted));
          height: 4px;
          border-radius: 2px;
        }
      `}</style>
      <div className="mb-2 space-y-2">
        {parts.map((p, i) => renderPart(p, i))}
      </div>
    </>
  )
}

export default MessagePartsRenderer
