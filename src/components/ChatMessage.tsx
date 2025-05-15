import React from "react"
import MarkdownRenderer from "./MarkdownRenderer"
import { DEFAULT_USER_AVATAR, DITTO_AVATAR } from "@/constants"
import { useAuth } from "@/hooks/useAuth"
import { useUserAvatar } from "@/hooks/useUserAvatar"
import { Copy, Brain, Trash } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFontSize } from "@/hooks/useFontSize"

// UI component imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

// Note: We've migrated from the custom AvatarActionMenu to shadcn's DropdownMenu

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
  }
}

export default function ChatMessage({
  content,
  timestamp,
  isUser,
  isLast = false,
  isOptimistic = false,
  menuProps,
}: ChatMessageProps) {
  const { user } = useAuth()
  const userAvatar = useUserAvatar(user?.photoURL)
  const avatar = isUser
    ? user?.photoURL || "/placeholders/user-avatar.png"
    : "/placeholders/ditto-avatar.png"
  const { fontSize } = useFontSize()
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

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
              ? "bg-primary text-primary-foreground rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm"
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
            {/* Timestamp display */}
            <div className="text-xs opacity-70 text-right mt-1">
              {isOptimistic
                ? content === ""
                  ? "Thinking..."
                  : "Streaming..."
                : formatTimestamp(timestamp)}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Avatar below bubble */}
      <div className="mt-1.5 mb-1.5">
        {" "}
        {/* important margin for avatar spacing */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar
              className="h-7 w-7 cursor-pointer transition-transform hover:scale-110 ring-2 ring-blue-500 shadow-md shadow-blue-500"
              onPointerDown={triggerLightHaptic}
            >
              <AvatarImage
                src={avatar}
                alt={isUser ? "User Avatar" : "Ditto Avatar"}
                className="object-cover"
                draggable={false}
              />
              <AvatarFallback>{isUser ? "U" : "D"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          {menuProps && (
            <DropdownMenuContent
              align={isUser ? "end" : "start"}
              className="w-auto"
            >
              <DropdownMenuItem
                onPointerDown={triggerLightHaptic}
                onClick={menuProps.onCopy}
              >
                <Copy className="mr-2 h-4 w-4" />
                <span>Copy</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onPointerDown={triggerLightHaptic}
                onClick={menuProps.onShowMemories}
              >
                <Brain className="mr-2 h-4 w-4" />
                <span>Memories</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onPointerDown={triggerLightHaptic}
                onClick={menuProps.onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </div>
  )
}
