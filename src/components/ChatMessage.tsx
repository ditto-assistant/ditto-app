import React, { useState } from "react"
import MarkdownRenderer from "./MarkdownRenderer"
import { DEFAULT_USER_AVATAR, DITTO_AVATAR } from "@/constants"
import { useAuth } from "@/hooks/useAuth"
import { useUserAvatar } from "@/hooks/useUserAvatar"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import {
  Copy,
  Brain,
  Trash,
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Link,
  Palette,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useFontSize } from "@/hooks/useFontSize"
import { SubAgentDisplay } from "@/hooks/useConversationHistory"

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
  contentArray?: Array<{ type: string; text?: string; imageURL?: string }> // New v3 content array
  images?: string[] // Array of image URLs
  subAgents?: SubAgentDisplay[] // Sub-agent sections for real-time streaming
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
  contentArray,
  images = [],
  subAgents = [],
  menuProps,
}: ChatMessageProps) {
  const { user } = useAuth()
  const userAvatar = useUserAvatar(user?.photoURL)
  const avatar = isUser ? (userAvatar ?? DEFAULT_USER_AVATAR) : DITTO_AVATAR
  const { fontSize } = useFontSize()
  const { handleImageClick } = useImageViewerHandler()
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  // State for sub-agent collapse management
  const [collapsedSubAgents, setCollapsedSubAgents] = useState<Set<string>>(
    new Set()
  )

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

  // Helper functions for sub-agent UI
  const getSubAgentIcon = (agentType: "research" | "art") => {
    switch (agentType) {
      case "research":
        return <Search className="h-4 w-4" />
      case "art":
        return <Palette className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getSubAgentColor = (agentType: "research" | "art") => {
    switch (agentType) {
      case "research":
        return "#9C27B0" // Purple for research
      case "art":
        return "#4CAF50" // Green for art
      default:
        return "#9C27B0"
    }
  }

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "search_web":
        return <Globe className="h-3 w-3" />
      case "search_memories":
        return <Brain className="h-3 w-3" />
      case "read_link":
        return <Link className="h-3 w-3" />
      case "generate_image":
        return <Palette className="h-3 w-3" />
      case "generate_openscad":
        return <Search className="h-3 w-3" />
      case "generate_html":
        return <Search className="h-3 w-3" />
      default:
        return <Search className="h-3 w-3" />
    }
  }

  const toggleSubAgentCollapse = (subAgentId: string) => {
    setCollapsedSubAgents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(subAgentId)) {
        newSet.delete(subAgentId)
      } else {
        newSet.add(subAgentId)
      }
      return newSet
    })
  }

  const isSubAgentCollapsed = (subAgent: SubAgentDisplay) => {
    // Use local state if available, otherwise use the subAgent's isCollapsed property
    return collapsedSubAgents.has(subAgent.id) || subAgent.isCollapsed
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
              <div>
                {/* Images from content array or legacy images prop */}
                {(images.length > 0 ||
                  (contentArray &&
                    contentArray.some((c) => c.type === "image"))) && (
                  <div className="mb-3 space-y-2">
                    {/* Render images from contentArray */}
                    {contentArray
                      ?.filter((c) => c.type === "image" && c.imageURL)
                      .map((imageContent, idx) => (
                        <img
                          key={`content-${idx}`}
                          src={imageContent.imageURL}
                          alt="Attached image"
                          className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          loading="lazy"
                          onClick={() =>
                            handleImageClick(imageContent.imageURL!)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              handleImageClick(imageContent.imageURL!)
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label="Click to view image in full screen"
                        />
                      ))}
                    {/* Render images from legacy images prop */}
                    {images.map((imageUrl, idx) => (
                      <img
                        key={`legacy-${idx}`}
                        src={imageUrl}
                        alt="Attached image"
                        className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        loading="lazy"
                        onClick={() => handleImageClick(imageUrl)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            handleImageClick(imageUrl)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label="Click to view image in full screen"
                      />
                    ))}
                  </div>
                )}

                {/* Legacy and modern tool calls from content array */}
                {!isUser && contentArray && (
                  <div className="mb-3 space-y-2">
                    {contentArray
                      .filter((c) => c.type === "tool_call")
                      .map((toolCallContent, idx) => {
                        // Find corresponding tool result
                        const toolResult = contentArray.find(
                          (c) =>
                            c.type === "tool_result" &&
                            c.toolResultID === toolCallContent.toolCallID + "_result"
                        )

                        return (
                          <Card
                            key={`tool-${idx}`}
                            className="border border-blue-200 bg-blue-50/50"
                          >
                            <CardContent className="p-3">
                              {/* Tool call header */}
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="p-1 rounded bg-blue-500 text-white">
                                  {getToolIcon(toolCallContent.toolName || "")}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-sm">
                                    {toolCallContent.toolName}
                                  </span>
                                  {toolCallContent.toolArgs?.task && (
                                    <span className="text-xs text-muted-foreground">
                                      {toolCallContent.toolArgs.task}
                                    </span>
                                  )}
                                  {toolCallContent.toolArgs?.legacy_type && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">
                                      Legacy: {toolCallContent.toolArgs.legacy_type}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Tool result */}
                              {toolResult && (
                                <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                  <div className="font-medium mb-1">Result:</div>
                                  <div className="text-muted-foreground">
                                    {toolResult.toolOutput?.type === "image" &&
                                    toolResult.toolOutput?.image_url ? (
                                      <img
                                        src={toolResult.toolOutput.image_url}
                                        alt="Generated content"
                                        className="max-w-full h-auto rounded border"
                                        onClick={() =>
                                          handleImageClick(
                                            toolResult.toolOutput.image_url
                                          )
                                        }
                                      />
                                    ) : (
                                      <span>
                                        {toolResult.toolOutput?.content ||
                                          "Tool executed successfully"}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                  </div>
                )}

                {/* Sub-agent sections for real-time updates */}
                {!isUser && subAgents && subAgents.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {subAgents.map((subAgent) => {
                      const collapsed = isSubAgentCollapsed(subAgent)
                      const agentColor = getSubAgentColor(subAgent.agentType)

                      return (
                        <Card
                          key={subAgent.id}
                          className="border border-opacity-50"
                          style={{ borderColor: agentColor }}
                        >
                          <CardContent className="p-2">
                            {/* Sub-agent header */}
                            <div
                              className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors"
                              onClick={() =>
                                toggleSubAgentCollapse(subAgent.id)
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className="p-1 rounded text-white"
                                  style={{ backgroundColor: agentColor }}
                                >
                                  {getSubAgentIcon(subAgent.agentType)}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm capitalize">
                                      {subAgent.agentType} Agent
                                    </span>
                                    {subAgent.status === "running" && (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {subAgent.query}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                {subAgent.toolCalls.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {subAgent.toolCalls.length} tools
                                  </span>
                                )}
                                {collapsed ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </div>
                            </div>

                            {/* Sub-agent content (collapsible) */}
                            {!collapsed && (
                              <div className="mt-2 pl-7 space-y-1">
                                {/* Tool calls list */}
                                {subAgent.toolCalls.map((toolCall, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center space-x-2 text-xs text-muted-foreground"
                                  >
                                    {getToolIcon(toolCall.tool)}
                                    <span className="font-medium">
                                      {toolCall.tool}
                                    </span>
                                    {toolCall.query && (
                                      <span className="truncate max-w-[150px]">
                                        &quot;{toolCall.query}&quot;
                                      </span>
                                    )}
                                    {toolCall.url && (
                                      <span className="truncate max-w-[150px]">
                                        {toolCall.url}
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {/* Summary (if completed) */}
                                {subAgent.status === "completed" &&
                                  subAgent.summary && (
                                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                      <div className="font-medium mb-1">
                                        Summary:
                                      </div>
                                      <div className="text-muted-foreground">
                                        {subAgent.summary}
                                      </div>
                                    </div>
                                  )}

                                {/* Status indicator */}
                                {subAgent.status === "running" && (
                                  <div className="text-xs text-muted-foreground italic">
                                    Working...
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                {/* Message content with markdown rendering */}
                {content && (
                  <div
                    className={cn(
                      "prose dark:prose-invert max-w-none",
                      fontSize === "small" && "text-sm",
                      fontSize === "medium" && "text-base",
                      fontSize === "large" && "text-lg"
                    )}
                  >
                    <MarkdownRenderer
                      key={`markdown-${content?.length || 0}`}
                      content={
                        typeof content === "string"
                          ? content
                          : String(content || "")
                      }
                    />
                  </div>
                )}
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
              className="h-7 w-7 cursor-pointer hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50"
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
