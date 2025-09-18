import MarkdownRenderer from "../MarkdownRenderer"
import { ContentV2 } from "@/api/getMemories"
import {
  Wrench,
  Play,
  Volume2,
  FileText,
  Pause,
  Brain,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
  const [collapsedStates, setCollapsedStates] = useState<
    Record<string, boolean>
  >({})

  const toggleCollapsed = (key: string) => {
    setCollapsedStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

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
            alt={part.alt || `${keyPrefix} image`}
            className="rounded-md border border-border max-w-full"
            draggable={false}
          />
        )
      case "tool_call":
        if (!part.toolCall) return null
        const { name, args } = part.toolCall
        const toolCallKey = `${key}-tool-call`
        const isToolCallOpen = collapsedStates[toolCallKey] || false
        return (
          <Collapsible
            key={key}
            open={isToolCallOpen}
            onOpenChange={() => toggleCollapsed(toolCallKey)}
          >
            <div className="bg-muted/50 rounded-md border border-border">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/70 transition-colors">
                  <Wrench size={16} className="text-muted-foreground" />
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Tool Call:
                    </span>
                    <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                      {name}
                    </span>
                  </div>
                  {isToolCallOpen ? (
                    <ChevronDown size={16} className="text-muted-foreground" />
                  ) : (
                    <ChevronRight size={16} className="text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="text-xs text-muted-foreground">
                  <pre className="whitespace-pre-wrap break-words font-mono">
                    {
                      part.toolCall.rawArguments
                        ? part.toolCall.rawArguments // Show raw streaming text
                        : JSON.stringify(args, null, 2) // Show pretty-printed JSON when finished
                    }
                  </pre>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      case "reasoning":
        const reasoningKey = `${key}-reasoning`
        // Auto-open if streaming, auto-collapse if not streaming
        const isReasoningStreaming = part.isStreaming ?? false
        const isReasoningOpen =
          collapsedStates[reasoningKey] !== undefined
            ? collapsedStates[reasoningKey]
            : isReasoningStreaming
        return (
          <Collapsible
            key={key}
            open={isReasoningOpen}
            onOpenChange={() => toggleCollapsed(reasoningKey)}
          >
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                  <Brain
                    size={16}
                    className={`${isReasoningStreaming ? "animate-pulse" : ""} text-blue-600 dark:text-blue-400`}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {isReasoningStreaming ? "Thinking..." : "Thinking"}
                    </span>
                  </div>
                  {isReasoningOpen ? (
                    <ChevronDown
                      size={16}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  ) : (
                    <ChevronRight
                      size={16}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  <MarkdownRenderer>{part.content}</MarkdownRenderer>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
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
