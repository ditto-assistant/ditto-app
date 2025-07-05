import React, { useState } from "react"
import MarkdownRenderer from "./MarkdownRenderer"
import { DEFAULT_USER_AVATAR, DITTO_AVATAR } from "@/constants"
import { useAuth } from "@/hooks/useAuth"
import { useUserAvatar } from "@/hooks/useUserAvatar"
import { Copy, Brain, Trash, Tags, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFontSize } from "@/hooks/useFontSize"
import SyncIndicator from "./SyncIndicator"
import { getSubjectsForPairs, SubjectWithCount } from "@/api/subjects"
import { toast } from "sonner"

// UI component imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"

const detectToolType = (text: string) => {
  if (!text) return null
  if (text.includes("Image Task:") || text.includes("<IMAGE_GENERATION>"))
    return "image"
  if (text.includes("Google Search Query:") || text.includes("<GOOGLE_SEARCH>"))
    return "search"
  if (
    text.includes("OpenSCAD Script Generated") ||
    text.includes("<OPENSCAD_SCRIPT>")
  )
    return "openscad"
  if (text.includes("HTML Script Generated") || text.includes("<HTML_SCRIPT>"))
    return "html"
  if (text.includes("Home Assistant Task:")) return "home"

  return null
}

// Tool label colors and texts
const toolLabels: Record<string, { color: string; text: string }> = {
  openscad: { color: "#1E88E5", text: "OpenSCAD" },
  html: { color: "#FF9800", text: "HTML" },
  image: { color: "#4CAF50", text: "Image" },
  search: { color: "#9C27B0", text: "Search" },
  home: { color: "#F44336", text: "Home" },
}

interface ChatMessageProps {
  content: string
  timestamp: number | Date
  isUser: boolean
  isLast?: boolean
  isOptimistic?: boolean
  menuProps: {
    onCopy: () => void
    onDelete: () => void
    onShowMemories: () => void
    id: string
  }
  // Sync indicator props
  showSyncIndicator?: boolean
  syncStage?: number
}

export default function ChatMessage({
  content,
  timestamp,
  isUser,
  isLast = false,
  isOptimistic = false,
  menuProps,
  showSyncIndicator = false,
  syncStage = 1,
}: ChatMessageProps) {
  const { user } = useAuth()
  const userAvatar = useUserAvatar(user?.photoURL)
  const avatar = isUser ? (userAvatar ?? DEFAULT_USER_AVATAR) : DITTO_AVATAR
  const { fontSize } = useFontSize()
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null)

  const handleFetchSubjects = async () => {
    // No caching for now to ensure it always fetches on open
    setIsLoadingSubjects(true)
    setErrorSubjects(null)

    // Assuming the message object has a pairID, which it should if it's not optimistic.
    // The parent component should ensure `id` is the permanent pairID.
    const result = await getSubjectsForPairs([menuProps.id])

    if (result.ok) {
      const subjectsForPair = result.ok.get(menuProps.id) || []
      setSubjects(subjectsForPair)
      if (subjectsForPair.length === 0) {
        toast.info("No subjects found for this memory.")
      }
    } else {
      const errorMsg = result.err ?? "An unknown error occurred."
      setErrorSubjects(errorMsg)
      toast.error(`Failed to get subjects: ${errorMsg}`)
    }

    setIsLoadingSubjects(false)
  }

  // Debug logging for sync indicator
  if (showSyncIndicator) {
    console.log("🔍 [ChatMessage Debug] Sync indicator should show:", {
      showSyncIndicator,
      syncStage,
      isUser,
      isLast,
      isOptimistic,
    })
  }

  const formatTimestamp = (timestamp: number | Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    } else if (diffInHours < 168) {
      // 7 days
      return (
        date.toLocaleDateString([], { weekday: "short" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      )
    } else {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      )
    }
  }

  const toolType = isUser ? null : detectToolType(content)

  // Animation classes for entry animation
  const animationClass = isLast
    ? "animate-in fade-in-0 slide-in-from-bottom-3 duration-300"
    : ""

  return (
    // Outer wrapper: stack messages vertically, align left/right
    <div
      className={cn(
        "flex flex-col w-full", // stack each message
        isUser ? "items-end" : "items-start", // shift row right/left via flex-col cross-axis
        isOptimistic && "opacity-80",
        animationClass
      )}
    >
      {/* Chat bubble */}
      <div className="max-w-[95%] pt-2 overflow-visible relative">
        <Card
          className={cn(
            "py-0",
            isUser
              ? "bg-secondary text-secondary-foreground rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm"
              : "bg-card text-card-foreground rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm",
            isOptimistic && "border border-dashed border-opacity-20"
          )}
        >
          <CardContent className="p-3 sm:p-4 relative">
            {" "}
            {/* Responsive padding */}
            {/* Tool label: Positioned above message with background color */}
            {toolType && (
              <div
                className="absolute -top-1.5 left-3 px-2 py-0.5 text-xs font-bold rounded-full text-white z-10"
                style={{
                  backgroundColor: toolLabels[toolType].color,
                }}
              >
                {toolLabels[toolType].text}
              </div>
            )}
            {/* Loading indicator for optimistic bot messages */}
            {isOptimistic && !isUser && content === "" ? (
              <div className="flex justify-center items-center py-2">
                {" "}
                {/* Center the loading dots */}
                <div className="flex space-x-1">
                  {" "}
                  {/* Horizontal layout with spacing */}
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0ms]"></div>
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:150ms]"></div>
                  <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:300ms]"></div>
                </div>
              </div>
            ) : (
              // Message content with markdown rendering
              <div
                className={cn(
                  "prose dark:prose-invert max-w-none",
                  fontSize === "small" && "text-sm",
                  fontSize === "medium" && "text-base",
                  fontSize === "large" && "text-lg"
                )}
              >
                <MarkdownRenderer content={content} />
              </div>
            )}
            {/* Sync Indicator - keep inside bubble when syncing */}
            {!isUser && showSyncIndicator && (
              <div className="flex items-center mt-2">
                <div className="text-xs opacity-70">
                  <SyncIndicator isVisible={true} currentStage={syncStage} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gutter area with Avatar, Action Buttons, and Timestamp */}
      <div className="mt-1.5 mb-1.5 flex items-center gap-2 w-full">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className="h-7 w-7 ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50">
            <AvatarImage
              src={avatar}
              alt={isUser ? "User Avatar" : "Ditto Avatar"}
              className="object-cover"
              draggable={false}
            />
            <AvatarFallback>{isUser ? "U" : "D"}</AvatarFallback>
          </Avatar>
        </div>

        {/* Action buttons and timestamp - only show if not syncing */}
        {!isOptimistic && !showSyncIndicator && (
          <div className="flex items-center gap-1.5 flex-1">
            {/* Subjects Dropdown */}
            <DropdownMenu
              onOpenChange={(open) => {
                if (open) {
                  handleFetchSubjects()
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-foreground/70 hover:bg-background/20"
                  aria-label="View linked subjects"
                >
                  {isLoadingSubjects ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Tags className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuLabel>Linked Subjects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-2">
                  {errorSubjects && (
                    <p className="text-xs text-destructive">{errorSubjects}</p>
                  )}
                  {subjects.length > 0
                    ? subjects.map((s, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm font-medium">
                            {s.subject_text}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {s.pair_count} pairs
                          </span>
                        </div>
                      ))
                    : !errorSubjects &&
                      !isLoadingSubjects && (
                        <p className="text-xs text-muted-foreground">
                          No subjects found.
                        </p>
                      )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:bg-background/20"
              onClick={() => {
                triggerLightHaptic()
                menuProps.onCopy()
              }}
              aria-label="Copy message"
            >
              <Copy className="h-5 w-5" />
            </Button>

            {/* Memories Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:bg-background/20"
              onClick={() => {
                triggerLightHaptic()
                menuProps.onShowMemories()
              }}
              aria-label="Show memories"
            >
              <Brain className="h-5 w-5" />
            </Button>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/70 hover:bg-background/20 hover:text-destructive"
              onClick={() => {
                triggerLightHaptic()
                menuProps.onDelete()
              }}
              aria-label="Delete message"
            >
              <Trash className="h-5 w-5" />
            </Button>

            {/* Timestamp */}
            <div className="ml-auto text-xs opacity-70 flex-shrink-0">
              {isOptimistic
                ? content === ""
                  ? "Thinking..."
                  : "Streaming..."
                : formatTimestamp(timestamp)}
            </div>
          </div>
        )}

        {/* Timestamp only (when syncing or optimistic) */}
        {(isOptimistic || showSyncIndicator) && (
          <div className="ml-auto text-xs opacity-70 flex-shrink-0">
            {isOptimistic
              ? content === ""
                ? "Thinking..."
                : "Streaming..."
              : formatTimestamp(timestamp)}
          </div>
        )}
      </div>
    </div>
  )
}
