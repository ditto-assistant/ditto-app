import { DEFAULT_USER_AVATAR, DITTO_AVATAR } from "@/constants"
import { useUserAvatar } from "@/hooks/useUserAvatar"
import { cn } from "@/lib/utils"
import { useFontSize } from "@/hooks/useFontSize"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { formatChatTimestamp } from "@/lib/time"
import { detectToolType } from "@/lib/toolUtils"
import MessagePartsRenderer from "./MessagePartsRenderer"
import LoadingIndicator from "./LoadingIndicator"
import ToolLabel from "./ToolLabel"
import MessageActions from "./MessageActions"
import SyncIndicator from "./SyncIndicator"
import MarkdownRenderer from "../MarkdownRenderer"
import { ContentV2 } from "@/api/getMemories"

interface ChatMessageProps {
  content?: string
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
  // Action visibility control
  hideActions?: {
    delete?: boolean
    memories?: boolean
    subjects?: boolean
  }
  // Progressive image rendering
  imagePartial?: string
  imageURL?: string
  // v2 content arrays (already presigned by backend)
  inputParts?: ContentV2[]
  outputParts?: ContentV2[]
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
  hideActions = {},
  imagePartial,
  imageURL,
  inputParts,
  outputParts,
}: ChatMessageProps) {
  const userAvatar = useUserAvatar()
  const avatar = isUser ? (userAvatar ?? DEFAULT_USER_AVATAR) : DITTO_AVATAR
  const { fontSize } = useFontSize()

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
            {toolType && <ToolLabel toolType={toolType} />}
            {/* Loading indicator for optimistic bot messages */}
            {isOptimistic && !isUser && content === "" ? (
              <LoadingIndicator />
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
                {/* Render v2 parts if provided (images/files already presigned) */}
                {inputParts && isUser && (
                  <MessagePartsRenderer
                    parts={inputParts}
                    isOptimistic={isOptimistic}
                    keyPrefix="in"
                  />
                )}
                {outputParts && !isUser && (
                  <MessagePartsRenderer
                    parts={outputParts}
                    isOptimistic={isOptimistic}
                    keyPrefix="out"
                  />
                )}

                {/* Progressive image preview if present */}
                {imagePartial && (
                  <img
                    src={imagePartial}
                    alt="Generating image..."
                    className="mb-2 rounded-md border border-border max-w-full"
                    draggable={false}
                  />
                )}
                {imageURL && (
                  <img
                    src={imageURL}
                    alt="Generated image"
                    className="mb-2 rounded-md border border-border max-w-full"
                    draggable={false}
                  />
                )}
                <MarkdownRenderer>{content}</MarkdownRenderer>
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
      <div
        className={cn(
          "mt-1.5 mb-1.5 flex items-center gap-2 w-full",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
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

        {isOptimistic ? (
          <div className="text-xs opacity-70 flex-shrink-0">
            {isUser
              ? formatChatTimestamp(timestamp)
              : content === ""
                ? "Thinking..."
                : "Streaming..."}
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center gap-1.5 flex-1",
              isUser ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className="text-xs opacity-70 flex-shrink-0">
              {formatChatTimestamp(timestamp)}
            </div>

            <MessageActions
              isUser={isUser}
              pairID={menuProps.id}
              showSyncIndicator={showSyncIndicator}
              hideActions={hideActions}
              onCopy={menuProps.onCopy}
              onDelete={menuProps.onDelete}
              onShowMemories={menuProps.onShowMemories}
            />
          </div>
        )}
      </div>
    </div>
  )
}
