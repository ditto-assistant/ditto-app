import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  RefObject,
  ReactNode,
  CSSProperties,
} from "react"
import "./ChatFeed.css"
import { ChevronDown } from "lucide-react"
import { useMemoryDeletion } from "../hooks/useMemoryDeletion"
import { toast } from "sonner"
import { useMemoryNetwork } from "@/hooks/useMemoryNetwork"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePlatform } from "@/hooks/usePlatform"
import { useMemorySyncContext } from "@/contexts/MemorySyncContext"
import ChatMessage from "./ChatMessage"
import { Memory } from "@/api/getMemories"

interface OptimisticMemory extends Memory {
  isOptimistic?: boolean
  streamingResponse?: string
  imageURL?: string
}

interface CustomScrollToBottomProps {
  children: ReactNode
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
  onScrollComplete?: () => void
  className?: string
  style?: CSSProperties
  scrollViewClassName?: string
  initialScrollBehavior?: ScrollBehavior
  detectScrollToTop?: () => void
  onScrollToTopRef?: RefObject<(() => void) | null>
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ChatFeedProps {
  // Future props can be added here
}

const CustomScrollToBottom = ({
  children,
  onScroll,
  onScrollComplete,
  className: containerClassName,
  style: containerStyle,
  scrollViewClassName,
  initialScrollBehavior = "auto",
  detectScrollToTop = () => {},
  onScrollToTopRef,
}: CustomScrollToBottomProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const isInitialScrollRef = useRef(true)
  const prevScrollTopRef = useRef(0)
  const scrollHeightRef = useRef(0)

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: behavior,
    })
  }

  useEffect(() => {
    if (onScrollToTopRef) {
      onScrollToTopRef.current = detectScrollToTop
    }

    if (scrollContainerRef.current) {
      if (isInitialScrollRef.current) {
        scrollToBottom(initialScrollBehavior)
        isInitialScrollRef.current = false
      }
    }
  }, [detectScrollToTop, initialScrollBehavior, onScrollToTopRef])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return

    const scrollContainer = scrollContainerRef.current
    const scrollTop = scrollContainer.scrollTop
    const scrollHeight = scrollContainer.scrollHeight
    const clientHeight = scrollContainer.clientHeight

    const isBottom = scrollHeight - scrollTop - clientHeight < 30
    setShowScrollToBottom(!isBottom)

    const isNearTop = scrollTop < 50

    if (
      isNearTop &&
      scrollTop < prevScrollTopRef.current &&
      scrollHeightRef.current === scrollHeight
    ) {
      detectScrollToTop()
    }

    prevScrollTopRef.current = scrollTop
    scrollHeightRef.current = scrollHeight

    if (onScroll) {
      onScroll(e)
    }

    if (onScrollComplete) {
      onScrollComplete()
    }
  }

  return (
    <div className={containerClassName} style={containerStyle}>
      <div
        ref={scrollContainerRef}
        className={scrollViewClassName || "custom-scroll-view"}
        onScroll={handleScroll}
        style={{
          overflowY: "auto",
          height: "100%",
          position: "relative",
        }}
      >
        {children}
      </div>

      {showScrollToBottom && (
        <button
          className="follow-button"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            scrollToBottom()
          }}
          aria-label="Scroll to bottom"
          type="button"
          style={{
            visibility: "visible",
            display: "flex",
            pointerEvents: "auto",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)",
            touchAction: "none",
            fontSize: "var(--font-size-default)",
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
          }}
        >
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  )
}

const ChatFeed = forwardRef<(() => void) | null, ChatFeedProps>(({}, ref) => {
  const {
    messages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useConversationHistory()
  const { showMemoryNetwork } = useMemoryNetwork()
  const { confirmMemoryDeletion } = useMemoryDeletion()
  const { isMobile } = usePlatform()
  const { syncsInProgress, checkStatuses } = useMemorySyncContext()

  const [messagesVisible, setMessagesVisible] = useState(false)
  const [shouldFetchNext, setShouldFetchNext] = useState(false)
  const initialRenderRef = useRef(true)
  const fetchingRef = useRef(false)
  const detectScrollToTopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const messageIDs = messages
        .filter((msg) => !msg.isOptimistic && msg.response)
        .map((msg) => msg.id)
      if (messageIDs.length > 0) {
        checkStatuses(messageIDs)
      }
    }
  }, [isLoading, messages, checkStatuses])

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      if (isMobile && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
        setTimeout(() => {
          setMessagesVisible(true)
          initialRenderRef.current = false
        }, 200)
      } else {
        setMessagesVisible(true)
        initialRenderRef.current = false
      }
    }
  }, [isLoading, messages, isMobile])

  const handleScrollToTop = () => {
    if (
      hasNextPage &&
      !isLoading &&
      !isFetchingNextPage &&
      !fetchingRef.current
    ) {
      fetchingRef.current = true
      setShouldFetchNext(true)
    }
  }

  useEffect(() => {
    const fetchOlderMessages = async () => {
      if (!shouldFetchNext) return

      try {
        const scrollContainer = document.querySelector(
          ".messages-scroll-view"
        ) as HTMLElement
        let prevHeight = 0

        if (scrollContainer) {
          prevHeight = scrollContainer.scrollHeight
        }

        await fetchNextPage()

        setTimeout(() => {
          if (scrollContainer) {
            const newHeight = scrollContainer.scrollHeight
            const heightDifference = newHeight - prevHeight

            if (heightDifference > 0) {
              scrollContainer.scrollTop = heightDifference
            }
          }

          fetchingRef.current = false
          setShouldFetchNext(false)
        }, 150)
      } catch (error) {
        console.error("Error loading more messages:", error)
        fetchingRef.current = false
        setShouldFetchNext(false)
      }
    }

    if (shouldFetchNext) {
      fetchOlderMessages()
    }
  }, [shouldFetchNext, fetchNextPage])

  const handleCopy = (
    message: OptimisticMemory,
    type: "prompt" | "response" = "prompt"
  ) => {
    const textToCopy = type === "prompt" ? message.prompt : message.response
    if (!textToCopy) {
      toast.error("No content to copy")
      return
    }

    navigator.clipboard.writeText(textToCopy).then(
      () => {
        toast.success("Copied to clipboard")
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast.error("Failed to copy text")
      }
    )
  }

  const handleMessageDelete = async (message: OptimisticMemory) => {
    if (!message.id) {
      console.error("Cannot delete message: missing ID")
      toast.error("Failed to delete message")
      return
    }
    try {
      confirmMemoryDeletion(message.id, {
        onSuccess: () => {
          refetch()
        },
      })
    } catch (error) {
      console.error("Error deleting message:", error)
      toast.error("Failed to delete message")
    }
  }

  const handleShowMemories = async (message: OptimisticMemory) => {
    try {
      await showMemoryNetwork(message)
    } catch (error) {
      console.error("Error showing memory network:", error)
      toast.error("Failed to show memory network")
    }
  }

  useEffect(() => {
    if (ref) {
      if (typeof ref === "function") {
        ref(detectScrollToTopRef.current)
      } else if (ref.current !== undefined) {
        ref.current = detectScrollToTopRef.current
      }
    }
  }, [ref])

  return (
    <div className="chat-feed-container">
      {isFetchingNextPage && (
        <div
          className="loading-indicator"
          style={{ position: "sticky", top: 0, zIndex: 10 }}
        >
          <div className="loading-spinner"></div>
          <div>Loading more messages...</div>
        </div>
      )}

      {isLoading ? (
        <div className="empty-chat-message">
          <div className="loading-spinner"></div>
          <p>Loading conversation...</p>
        </div>
      ) : messages && messages.length > 0 ? (
        <CustomScrollToBottom
          className="messages-container"
          scrollViewClassName="messages-scroll-view"
          initialScrollBehavior="auto"
          detectScrollToTop={handleScrollToTop}
          onScrollToTopRef={detectScrollToTopRef}
          style={{
            opacity: messagesVisible ? 1 : 0,
            transition: "opacity 0.2s ease-in-out",
          }}
        >
          {messages
            .map((message, index) => {
              const isUser =
                message.prompt && !message.prompt.includes("SYSTEM:")
              const isLast = index === messages.length - 1

              const syncState = syncsInProgress.get(message.id)
              const showSync = !!syncState
              const syncStage = syncState?.stage || 1

              return (
                <div key={message.id || index} className="message-pair">
                  {message.prompt && isUser && (
                    <ChatMessage
                      content={message.prompt}
                      timestamp={
                        message.timestamp
                          ? new Date(message.timestamp).getTime()
                          : Date.now()
                      }
                      isUser={true}
                      isLast={isLast}
                      isOptimistic={message.isOptimistic}
                      menuProps={{
                        id: message.id,
                        onCopy: () => handleCopy(message, "prompt"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                      showSyncIndicator={showSync}
                      syncStage={syncStage}
                    />
                  )}

                  {message.response && (
                    <ChatMessage
                      content={message.response}
                      timestamp={
                        message.timestamp
                          ? new Date(message.timestamp).getTime()
                          : Date.now()
                      }
                      isUser={false}
                      isLast={isLast}
                      isOptimistic={message.isOptimistic}
                      menuProps={{
                        id: message.id,
                        onCopy: () => handleCopy(message, "response"),
                        onDelete: () => handleMessageDelete(message),
                        onShowMemories: () => handleShowMemories(message),
                      }}
                      showSyncIndicator={showSync}
                      syncStage={syncStage}
                    />
                  )}
                </div>
              )
            })
            .reverse()}
        </CustomScrollToBottom>
      ) : (
        <div className="empty-chat-message">
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}
    </div>
  )
})

ChatFeed.displayName = "ChatFeed"
export default ChatFeed
